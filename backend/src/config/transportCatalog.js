// Initial test network. Coordinates represent cities, not verified pickup facilities.
const COUNTRIES = [
  { code: 'VN', name: 'Việt Nam' },
  { code: 'TH', name: 'Thái Lan' },
  { code: 'KH', name: 'Campuchia' },
  { code: 'SG', name: 'Singapore' }
];

const STOPS = [
  { id: 'VN-HCM', name: 'TP. Hồ Chí Minh', countryCode: 'VN', coordinates: [106.7008, 10.7769], timeZone: 'Asia/Ho_Chi_Minh', utcOffset: '+07:00' },
  { id: 'VN-HAN', name: 'Hà Nội', countryCode: 'VN', coordinates: [105.8342, 21.0278], timeZone: 'Asia/Ho_Chi_Minh', utcOffset: '+07:00' },
  { id: 'VN-DAD', name: 'Đà Nẵng', countryCode: 'VN', coordinates: [108.2022, 16.0544], timeZone: 'Asia/Ho_Chi_Minh', utcOffset: '+07:00' },
  { id: 'TH-BKK', name: 'Bangkok', countryCode: 'TH', coordinates: [100.5018, 13.7563], timeZone: 'Asia/Bangkok', utcOffset: '+07:00' },
  { id: 'TH-CNX', name: 'Chiang Mai', countryCode: 'TH', coordinates: [98.9853, 18.7883], timeZone: 'Asia/Bangkok', utcOffset: '+07:00' },
  { id: 'KH-PNH', name: 'Phnom Penh', countryCode: 'KH', coordinates: [104.9282, 11.5564], timeZone: 'Asia/Phnom_Penh', utcOffset: '+07:00' },
  { id: 'KH-REP', name: 'Siem Reap', countryCode: 'KH', coordinates: [103.8564, 13.3633], timeZone: 'Asia/Phnom_Penh', utcOffset: '+07:00' },
  { id: 'SG-SIN', name: 'Singapore', countryCode: 'SG', coordinates: [103.8198, 1.3521], timeZone: 'Asia/Singapore', utcOffset: '+08:00' }
];
const TIME_SLOTS = ['08:00', '14:00'];
const BOOKING_WINDOW_DAYS = 28;
const MIN_NOTICE_HOURS = 24;
const pairs = [
  ['VN-HCM', 'VN-HAN'], ['VN-HCM', 'VN-DAD'], ['VN-HAN', 'VN-DAD'],
  ['VN-HCM', 'KH-PNH'], ['KH-PNH', 'KH-REP'], ['KH-PNH', 'TH-BKK'],
  ['TH-BKK', 'TH-CNX'], ['VN-HAN', 'TH-BKK'], ['VN-HCM', 'SG-SIN']
];
const DEFAULT_RULES = pairs.flatMap(([a, b]) => [
  { originStopId: a, destinationStopId: b, weekdays: [1, 3, 5], times: ['08:00'], active: true },
  { originStopId: b, destinationStopId: a, weekdays: [2, 4, 6], times: ['14:00'], active: true }
]);

module.exports = { COUNTRIES, STOPS, TIME_SLOTS, BOOKING_WINDOW_DAYS, MIN_NOTICE_HOURS, DEFAULT_RULES };
