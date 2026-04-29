// Google Ads Keywords module — REST surface that mirrors the existing
// `google_list_keywords` / `google_add_keywords` / `google_add_negative_keywords`
// AI tools but is callable directly from the frontend so the Keywords
// module doesn't have to go through the chat agent for ordinary list/CRUD.
//
// Conventions copied from campaigns.js / audiences.js:
//   • Customer is resolved via getCustomer(accountId, loginCustomerId)
//   • All errors funnel through handleApiError so logs stay consistent
//   • GAQL strings are kept readable (multi-line) — keywords/search terms
//     have a lot of fields and inlining them as one giant template
//     literal is hard to review.
//
// Endpoint summary:
//   GET    /api/google/keywords                          — positive keywords
//   GET    /api/google/keywords/negative                 — negative keywords
//   GET    /api/google/keywords/search-terms             — what users searched
//   GET    /api/google/keywords/ad-groups                — ad-group picker data
//   POST   /api/google/keywords                          — add positive keywords to ad group
//   POST   /api/google/keywords/negative                 — add negative keywords (campaign|adGroup)

import { Router } from 'express';
import { enums } from 'google-ads-api';
import { getCustomer, statusLabel, handleApiError, parseDateRange } from './client.js';

const router = Router();

// Match-type strings the UI sends → google-ads-api enum values. Validated
// before mutation so a typo'd "BORAD" returns a 400 instead of crashing
// inside the SDK with an opaque enum error.
const MATCH_TYPE_ENUM = {
  EXACT:  enums.KeywordMatchType.EXACT,
  PHRASE: enums.KeywordMatchType.PHRASE,
  BROAD:  enums.KeywordMatchType.BROAD,
};

// ── GET /api/google/keywords ─────────────────────────────────────────────
// Required: campaignId. Optional: adGroupId (further filter), dateRange.
router.get('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId, campaignId, adGroupId, dateRange } = req.query;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    let gaql = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id, ad_group.name, campaign.id, campaign.name,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM keyword_view
      WHERE campaign.id = ${campaignId}
        AND segments.date DURING ${range}
        AND ad_group_criterion.status != 'REMOVED'
    `;
    if (adGroupId) gaql += ` AND ad_group.id = ${adGroupId}`;
    gaql += ` ORDER BY metrics.impressions DESC LIMIT 200`;

    const rows = await customer.query(gaql);

    const keywords = rows.map(row => ({
      criterionId: String(row.ad_group_criterion?.criterion_id ?? ''),
      text: row.ad_group_criterion?.keyword?.text ?? '',
      matchType: String(row.ad_group_criterion?.keyword?.match_type ?? ''),
      status: statusLabel(row.ad_group_criterion?.status ?? ''),
      qualityScore: row.ad_group_criterion?.quality_info?.quality_score ?? null,
      adGroupId: String(row.ad_group?.id ?? ''),
      adGroupName: row.ad_group?.name ?? '',
      campaignId: String(row.campaign?.id ?? ''),
      campaignName: row.campaign?.name ?? '',
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
      conversions: Number(row.metrics?.conversions ?? 0),
      ctr: Number(row.metrics?.ctr ?? 0),
      avgCpc: Number(row.metrics?.average_cpc ?? 0) / 1_000_000,
    }));

    res.json({ keywords, campaignId });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/keywords'));
  }
});

// ── GET /api/google/keywords/ad-groups ───────────────────────────────────
// Powers the ad-group dropdown inside the Keywords UI. Cheap query — no
// metrics, just id/name/status under a campaign.
router.get('/ad-groups', async (req, res) => {
  try {
    const { accountId, loginCustomerId, campaignId } = req.query;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type
      FROM ad_group
      WHERE campaign.id = ${campaignId} AND ad_group.status != 'REMOVED'
      ORDER BY ad_group.name
    `);

    const adGroups = rows.map(row => ({
      id: String(row.ad_group?.id ?? ''),
      name: row.ad_group?.name ?? '',
      status: statusLabel(row.ad_group?.status ?? ''),
      type: String(row.ad_group?.type ?? ''),
    }));

    res.json({ adGroups, campaignId });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/keywords/ad-groups'));
  }
});

// ── GET /api/google/keywords/negative ────────────────────────────────────
// Negative keywords live on either campaigns or ad groups. Caller supplies
// one of campaignId/adGroupId — campaign-level wins if both provided.
router.get('/negative', async (req, res) => {
  try {
    const { accountId, loginCustomerId, campaignId, adGroupId } = req.query;
    if (!campaignId && !adGroupId) {
      return res.status(400).json({ error: 'campaignId or adGroupId is required' });
    }
    const customer = getCustomer(accountId, loginCustomerId);

    if (campaignId) {
      const rows = await customer.query(`
        SELECT
          campaign_criterion.criterion_id,
          campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type,
          campaign.id, campaign.name
        FROM campaign_criterion
        WHERE campaign.id = ${campaignId}
          AND campaign_criterion.negative = true
          AND campaign_criterion.type = 'KEYWORD'
      `);
      return res.json({
        negativeKeywords: rows.map(row => ({
          criterionId: String(row.campaign_criterion?.criterion_id ?? ''),
          text: row.campaign_criterion?.keyword?.text ?? '',
          matchType: String(row.campaign_criterion?.keyword?.match_type ?? ''),
          level: 'campaign',
          campaignId: String(row.campaign?.id ?? ''),
          campaignName: row.campaign?.name ?? '',
        })),
      });
    }

    // adGroup branch
    const rows = await customer.query(`
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group.id, ad_group.name
      FROM ad_group_criterion
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_criterion.negative = true
        AND ad_group_criterion.type = 'KEYWORD'
    `);
    res.json({
      negativeKeywords: rows.map(row => ({
        criterionId: String(row.ad_group_criterion?.criterion_id ?? ''),
        text: row.ad_group_criterion?.keyword?.text ?? '',
        matchType: String(row.ad_group_criterion?.keyword?.match_type ?? ''),
        level: 'adGroup',
        adGroupId: String(row.ad_group?.id ?? ''),
        adGroupName: row.ad_group?.name ?? '',
      })),
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/keywords/negative'));
  }
});

// ── GET /api/google/keywords/search-terms ────────────────────────────────
// What users actually typed. Useful for finding negative-keyword candidates
// and for spotting intent the keyword list isn't capturing.
router.get('/search-terms', async (req, res) => {
  try {
    const { accountId, loginCustomerId, campaignId, dateRange } = req.query;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const range = parseDateRange(dateRange);
    const customer = getCustomer(accountId, loginCustomerId);

    const rows = await customer.query(`
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        segments.keyword.info.text,
        segments.keyword.info.match_type,
        ad_group.id,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr
      FROM search_term_view
      WHERE campaign.id = ${campaignId}
        AND segments.date DURING ${range}
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `);

    res.json({
      searchTerms: rows.map(row => ({
        searchTerm: row.search_term_view?.search_term ?? '',
        status: String(row.search_term_view?.status ?? ''),
        keywordText: row.segments?.keyword?.info?.text ?? '',
        keywordMatchType: String(row.segments?.keyword?.info?.match_type ?? ''),
        adGroupId: String(row.ad_group?.id ?? ''),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        spend: Number(row.metrics?.cost_micros ?? 0) / 1_000_000,
        conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number(row.metrics?.ctr ?? 0),
      })),
      campaignId,
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'GET /api/google/keywords/search-terms'));
  }
});

// ── POST /api/google/keywords ────────────────────────────────────────────
// Body: { adGroupId, keywords: [{ text, matchType, cpcBidMicros? }] }
router.post('/', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { adGroupId, keywords } = req.body || {};

    if (!adGroupId) return res.status(400).json({ error: 'adGroupId is required' });
    if (!Array.isArray(keywords) || !keywords.length) {
      return res.status(400).json({ error: 'keywords must be a non-empty array' });
    }
    for (const kw of keywords) {
      if (!kw?.text || !MATCH_TYPE_ENUM[kw.matchType]) {
        return res.status(400).json({ error: `Invalid keyword entry: ${JSON.stringify(kw)}. matchType must be EXACT, PHRASE, or BROAD.` });
      }
    }

    const customer = getCustomer(accountId, loginCustomerId);
    const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;

    const mutations = keywords.map(kw => ({
      entity: 'ad_group_criterion',
      operation: 'create',
      resource: {
        ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
        keyword: { text: kw.text, match_type: MATCH_TYPE_ENUM[kw.matchType] },
        cpc_bid_micros: kw.cpcBidMicros || undefined,
        status: enums.AdGroupCriterionStatus.ENABLED,
      },
    }));

    const response = await customer.mutateResources(mutations);
    res.json({
      success: true,
      added: keywords.length,
      results: response.mutate_operation_responses,
      message: `Added ${keywords.length} keyword${keywords.length === 1 ? '' : 's'}.`,
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'POST /api/google/keywords'));
  }
});

// ── POST /api/google/keywords/negative ───────────────────────────────────
// Body: { level: 'campaign'|'adGroup', campaignId?, adGroupId?, keywords: [{ text, matchType }] }
router.post('/negative', async (req, res) => {
  try {
    const { accountId, loginCustomerId } = req.query;
    const { level, campaignId, adGroupId, keywords } = req.body || {};

    if (level !== 'campaign' && level !== 'adGroup') {
      return res.status(400).json({ error: 'level must be "campaign" or "adGroup"' });
    }
    if (level === 'campaign' && !campaignId) return res.status(400).json({ error: 'campaignId is required at campaign level' });
    if (level === 'adGroup' && !adGroupId)   return res.status(400).json({ error: 'adGroupId is required at adGroup level' });
    if (!Array.isArray(keywords) || !keywords.length) {
      return res.status(400).json({ error: 'keywords must be a non-empty array' });
    }
    for (const kw of keywords) {
      if (!kw?.text || !MATCH_TYPE_ENUM[kw.matchType]) {
        return res.status(400).json({ error: `Invalid keyword entry: ${JSON.stringify(kw)}. matchType must be EXACT, PHRASE, or BROAD.` });
      }
    }

    const customer = getCustomer(accountId, loginCustomerId);
    const customerId = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;

    let mutations;
    if (level === 'campaign') {
      mutations = keywords.map(kw => ({
        entity: 'campaign_criterion',
        operation: 'create',
        resource: {
          campaign: `customers/${customerId}/campaigns/${campaignId}`,
          negative: true,
          keyword: { text: kw.text, match_type: MATCH_TYPE_ENUM[kw.matchType] },
        },
      }));
    } else {
      mutations = keywords.map(kw => ({
        entity: 'ad_group_criterion',
        operation: 'create',
        resource: {
          ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
          negative: true,
          keyword: { text: kw.text, match_type: MATCH_TYPE_ENUM[kw.matchType] },
        },
      }));
    }

    const response = await customer.mutateResources(mutations);
    res.json({
      success: true,
      added: keywords.length,
      level,
      results: response.mutate_operation_responses,
      message: `Added ${keywords.length} negative keyword${keywords.length === 1 ? '' : 's'} at ${level} level.`,
    });
  } catch (err) {
    res.status(500).json(handleApiError(err, 'POST /api/google/keywords/negative'));
  }
});

export default router;
