// Kuroco 標準Memberモジュール相当（拡張項目: department_id, position）
export const memberList = {
  errors: [],
  messages: [],
  list: [
    { member_id: 1, name1: '田中', name2: '一郎', email: 'tanaka@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 1, dept_name: '総務部' }, position: '総務部長' },
    { member_id: 2, name1: '佐藤', name2: '花子', email: 'sato@procureflow.example.com', group: { key: 'requester', label: '申請者' }, department_id: { department_id: 1, dept_name: '総務部' }, position: '総務部 主任' },
    { member_id: 3, name1: '神田', name2: '正人', email: 'kanda@procureflow.example.com', group: { key: 'admin', label: '管理者' }, department_id: { department_id: 1, dept_name: '総務部' }, position: 'システム管理者' },
    { member_id: 4, name1: '鈴木', name2: '健太', email: 'suzuki@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 2, dept_name: '情報システム部' }, position: '情報システム部長' },
    { member_id: 5, name1: '高橋', name2: '誠', email: 'takahashi@procureflow.example.com', group: { key: 'it_staff', label: 'IT担当' }, department_id: { department_id: 2, dept_name: '情報システム部' }, position: '情報システム部 主任' },
    { member_id: 6, name1: '伊藤', name2: '沙耶', email: 'ito@procureflow.example.com', group: { key: 'requester', label: '申請者' }, department_id: { department_id: 2, dept_name: '情報システム部' }, position: '情報システム部 担当' },
    { member_id: 7, name1: '渡辺', name2: '淳', email: 'watanabe@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 3, dept_name: '購買部' }, position: '購買部長' },
    { member_id: 8, name1: '小林', name2: '正一', email: 'kobayashi@procureflow.example.com', group: { key: 'purchasing_staff', label: '購買担当' }, department_id: { department_id: 3, dept_name: '購買部' }, position: '購買部 主任' },
    { member_id: 9, name1: '山本', name2: '恵子', email: 'yamamoto@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 4, dept_name: '経理部' }, position: '経理部長' },
    { member_id: 10, name1: '中村', name2: '由美', email: 'nakamura@procureflow.example.com', group: { key: 'accounting_staff', label: '経理担当' }, department_id: { department_id: 4, dept_name: '経理部' }, position: '経理部 主任' },
    { member_id: 11, name1: '加藤', name2: '隆', email: 'kato@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 5, dept_name: '営業部' }, position: '営業部長' },
    { member_id: 12, name1: '吉田', name2: '美咲', email: 'yoshida@procureflow.example.com', group: { key: 'requester', label: '申請者' }, department_id: { department_id: 5, dept_name: '営業部' }, position: '営業部 担当' },
    { member_id: 13, name1: '松本', name2: '大輔', email: 'matsumoto@procureflow.example.com', group: { key: 'dept_manager', label: '部門長' }, department_id: { department_id: 6, dept_name: '開発部' }, position: '開発部長' },
    { member_id: 14, name1: '木村', name2: '健二', email: 'kimura@procureflow.example.com', group: { key: 'requester', label: '申請者' }, department_id: { department_id: 6, dept_name: '開発部' }, position: '開発部 担当' },
  ],
  pageInfo: { totalCnt: 14, perPage: 50, totalPageCnt: 1, pageNo: 1 },
}
