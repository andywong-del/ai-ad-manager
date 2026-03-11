const MOCK_AD_ACCOUNTS = [
  { id: 'act_111222333', account_id: '111222333', name: 'Andy Wong - Main',    account_status: 1, currency: 'USD', business_id: '9876543210', business_name: 'Andy Wong Holdings' },
  { id: 'act_444555666', account_id: '444555666', name: 'Brand Campaigns SG',  account_status: 1, currency: 'SGD', business_id: '9876543210', business_name: 'Andy Wong Holdings' },
  { id: 'act_777888999', account_id: '777888999', name: 'E-commerce Retarget', account_status: 1, currency: 'USD', business_id: '1122334455', business_name: 'Retarget Co.' },
];

export const useAdAccounts = (_token) => ({
  adAccounts: MOCK_AD_ACCOUNTS,
  isLoading:  false,
  error:      null,
});
