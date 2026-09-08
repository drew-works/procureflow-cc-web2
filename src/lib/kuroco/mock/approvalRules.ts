export const approvalRuleList = {
  errors: [],
  messages: [],
  list: [
    {
      rule_id: 1,
      rule_name: '10万円未満',
      min_amount: 0,
      max_amount: 100000,
      requires_it_review: false,
      steps: [{ order: 1, role: '部門長' }],
      active_flg: 1,
    },
    {
      rule_id: 2,
      rule_name: '10万円以上100万円未満',
      min_amount: 100000,
      max_amount: 1000000,
      requires_it_review: false,
      steps: [
        { order: 1, role: '部門長' },
        { order: 2, role: '購買担当' },
      ],
      active_flg: 1,
    },
    {
      rule_id: 3,
      rule_name: '100万円以上',
      min_amount: 1000000,
      max_amount: null,
      requires_it_review: false,
      steps: [
        { order: 1, role: '部門長' },
        { order: 2, role: '購買担当' },
        { order: 3, role: '管理者' },
      ],
      active_flg: 1,
    },
  ],
  pageInfo: { totalCnt: 3, perPage: 50, totalPageCnt: 1, pageNo: 1 },
}
