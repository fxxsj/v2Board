export type NavItem =
  | { type: 'heading'; title: string }
  | { type: 'item'; title: string; href: string; icon: string }

export const navItems: NavItem[] = [
  { type: 'item', title: '仪表盘', href: '/dashboard', icon: 'si si-speedometer' },
  { type: 'heading', title: '设置' },
  { type: 'item', title: '系统配置', href: '/config/system', icon: 'si si-equalizer' },
  { type: 'item', title: '支付配置', href: '/config/payment', icon: 'si si-credit-card' },
  { type: 'item', title: '主题配置', href: '/config/theme', icon: 'si si-magic-wand' },
  { type: 'heading', title: '服务器' },
  { type: 'item', title: '节点管理', href: '/server/manage', icon: 'si si-layers' },
  { type: 'item', title: '权限组管理', href: '/server/group', icon: 'si si-wrench' },
  { type: 'item', title: '路由管理', href: '/server/route', icon: 'si si-shuffle' },
  { type: 'heading', title: '财务' },
  { type: 'item', title: '订阅管理', href: '/plan', icon: 'si si-bag' },
  { type: 'item', title: '订单管理', href: '/order', icon: 'si si-list' },
  { type: 'item', title: '优惠券管理', href: '/coupon', icon: 'si si-present' },
  { type: 'item', title: '礼品卡管理', href: '/giftcard', icon: 'si si-star' },
  { type: 'heading', title: '用户' },
  { type: 'item', title: '用户管理', href: '/user', icon: 'si si-users' },
  { type: 'item', title: '公告管理', href: '/notice', icon: 'si si-speech' },
  { type: 'item', title: '工单管理', href: '/ticket', icon: 'si si-support' },
  { type: 'item', title: '知识库管理', href: '/knowledge', icon: 'si si-bulb' },
  { type: 'heading', title: '指标' },
  { type: 'item', title: '队列监控', href: '/queue', icon: 'si si-bar-chart' },
]

export const routeTitles = new Map<string, string>([
  ['/dashboard', '仪表盘'],
  ['/config/system', '系统配置'],
  ['/config/payment', '支付配置'],
  ['/config/theme', '主题配置'],
  ['/server/manage', '节点管理'],
  ['/server/group', '权限组管理'],
  ['/server/route', '路由管理'],
  ['/plan', '订阅管理'],
  ['/order', '订单管理'],
  ['/coupon', '优惠券管理'],
  ['/giftcard', '礼品卡管理'],
  ['/user', '用户管理'],
  ['/notice', '公告管理'],
  ['/ticket', '工单管理'],
  ['/knowledge', '知识库管理'],
  ['/queue', '队列监控'],
])
