export const budgetList = {
  errors: [],
  messages: [],
  list: [
    { budget_id: 1, department_id: { department_id: 1, dept_name: '総務部' }, fiscal_year: 2026, category: '一般', budget_amount: 5000000, used_amount: 1200000, note: '' },
    { budget_id: 2, department_id: { department_id: 2, dept_name: '情報システム部' }, fiscal_year: 2026, category: 'IT機器', budget_amount: 12000000, used_amount: 6800000, note: '端末更新・新入社員配備を含む' },
    { budget_id: 3, department_id: { department_id: 3, dept_name: '購買部' }, fiscal_year: 2026, category: '一般', budget_amount: 3000000, used_amount: 900000, note: '' },
    { budget_id: 4, department_id: { department_id: 4, dept_name: '経理部' }, fiscal_year: 2026, category: '一般', budget_amount: 2000000, used_amount: 450000, note: '' },
    { budget_id: 5, department_id: { department_id: 5, dept_name: '営業部' }, fiscal_year: 2026, category: '一般', budget_amount: 8000000, used_amount: 5200000, note: '' },
    { budget_id: 6, department_id: { department_id: 6, dept_name: '開発部' }, fiscal_year: 2026, category: '開発関連', budget_amount: 15000000, used_amount: 9100000, note: 'サーバー増設・検証機材を含む' },
  ],
  pageInfo: { totalCnt: 6, perPage: 50, totalPageCnt: 1, pageNo: 1 },
}
