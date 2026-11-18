// Fixtures for the order and listing pages until the server serves
// GET /v1/console/orders/{id} and /v1/console/listings/{id}. Only these ids
// are mocked; any other goes to the server, and so do hide and unhide on it.

import type { ListingDetail, OrderDetail } from '../commerce'
import { type Route, unmocked } from '.'

export const MOCK_ORDER = '00000000-0000-4000-8000-000000001042'
export const MOCK_LISTING = '00000000-0000-4000-8000-00000000a113'
export const MOCK_HIDDEN = '00000000-0000-4000-8000-00000000a114'

const PHOTO = 'https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/d0e7dcea-fa3d-477d-9b2a-e072f17a3ee7/content-assets/reported-iphone-photo/iphone-listing-640.webp'
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

const order: OrderDetail = {
  id: MOCK_ORDER,
  code: 'SN-1042',
  status: 'completed',
  price: 3_800_000,
  listing: { id: MOCK_LISTING, title: 'iPhone X 64GB, battery 86%', photo_url: PHOTO, status: 'sold', category: 'Phones', condition: 'good' },
  buyer: { id: '7b1c22e0-0000-4000-8000-000000000001', display_name: 'Khánh Linh', status: 'active', since: '2025-03-02T00:00:00Z' },
  seller: { id: '5e8a0100-0000-4000-8000-000000000002', display_name: 'Hoàng Nam', status: 'active', orders: 38, rating: 4.8 },
  completed_by: 'System, after the carrier reported delivery',
  created_at: ago(80),
  shipped_at: ago(72),
  closed_at: ago(26),
  shipment: { mode: 'cod_inspection', carrier: 'ghtk', tracking_code: 'S1.A1.17373471', status: 'delivered', fee: 32_000, delivered_at: ago(26) },
  carrier_now: 'Delivered · 14:21',
  events: [
    { status: 'placed', at: ago(80), note: 'COD with inspection' },
    { status: 'picked_up', at: ago(72), place: 'From Hoàng Nam, District 3' },
    { status: 'out_for_delivery', at: ago(32), place: 'Bình Thạnh hub' },
    { status: 'delivered', at: ago(26), place: 'Reception, building B', note: 'signed “Hằng”' },
  ],
  tickets: [{ id: 't1', person_display_name: 'Khánh Linh', kind: 'not_received', status: 'open', last_line: 'Mình hỏi bảo vệ rồi, không ai nhận giúp cả.', opened_at: ago(5) }],
}

const listing = (hidden: boolean): ListingDetail => ({
  id: hidden ? MOCK_HIDDEN : MOCK_LISTING,
  title: 'iPhone 13 Pro Max 256GB',
  price: 8_900_000,
  description: 'Máy zin, pin 88%, fullbox. Chuyển cọc 500k mình giữ hàng, ship toàn quốc.',
  category_code: 'phones',
  category_name: 'Phones',
  condition: 'good',
  status: hidden ? 'hidden' : 'active',
  allow_offers: true,
  commune: 'Gò Vấp',
  province: 'HCMC',
  photo_urls: [PHOTO, PHOTO, PHOTO, PHOTO],
  specs: [
    { label: 'Storage', value: '256 GB' },
    { label: 'Battery', value: '88%' },
  ],
  created_at: ago(200),
  published_at: ago(199),
  seller: { id: 'a1f0c3aa-0000-4000-8000-000000000003', display_name: 'Đồ Cũ Gò Vấp', status: 'active', listings: 14 },
  ...(hidden ? { hidden: { by_member_name: 'Nguyễn Thị Lan', at: ago(2), reason: 'Asks for a deposit before the buyer sees the phone.' } } : {}),
  reports: [
    { reporter_display_name: 'Quang Huy', reason: 'scam', note: 'Bắt chuyển cọc trước rồi chặn mình', at: ago(20) },
    { reporter_display_name: 'Minh Thư', reason: 'scam', note: 'Ảnh lấy trên mạng, hỏi video thì không gửi', at: ago(4) },
    { reporter_display_name: 'Bảo Ngọc', reason: 'fake', at: ago(3) },
  ],
  case_id: 'a1f0c3aa-0000-4000-8000-000000000003',
  price_guide: { median: 21_200_000, pct_vs_guide: -58 },
})

const listings: Record<string, ListingDetail> = { [MOCK_LISTING]: listing(false), [MOCK_HIDDEN]: listing(true) }

export const commerceRoutes: Route[] = [
  ['GET', /^\/console\/orders\/([^/]+)$/, (m) => (m[1] === MOCK_ORDER ? order : unmocked)],
  ['GET', /^\/console\/listings\/([^/]+)$/, (m) => listings[m[1]] ?? unmocked],
  [
    'POST',
    /^\/console\/listings\/([^/]+)\/hide$/,
    (m, body) => {
      const l = listings[m[1]]
      if (!l) return unmocked
      listings[m[1]] = { ...l, status: 'hidden', hidden: { by_member_name: 'You', at: new Date().toISOString(), reason: (body as { reason?: string })?.reason } }
      return {}
    },
  ],
  [
    'POST',
    /^\/console\/listings\/([^/]+)\/unhide$/,
    (m) => {
      const l = listings[m[1]]
      if (!l) return unmocked
      listings[m[1]] = { ...l, status: 'active', hidden: undefined }
      return {}
    },
  ],
]
