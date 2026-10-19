// Indian states and union territories with their capital (used for weather)
// and an approximate bounding box [west, south, east, north] (used to query
// satellite detections and to frame the map).

const STATES = [
  // States
  { name: "Andhra Pradesh", type: "state", capital: "Amaravati", lat: 16.515, lon: 80.516, bbox: [76.75, 12.6, 84.8, 19.95] },
  { name: "Arunachal Pradesh", type: "state", capital: "Itanagar", lat: 27.0844, lon: 93.6053, bbox: [91.55, 26.63, 97.42, 29.47] },
  { name: "Assam", type: "state", capital: "Dispur", lat: 26.1433, lon: 91.7898, bbox: [89.69, 24.13, 96.03, 28.0] },
  { name: "Bihar", type: "state", capital: "Patna", lat: 25.5941, lon: 85.1376, bbox: [83.32, 24.28, 88.3, 27.52] },
  { name: "Chhattisgarh", type: "state", capital: "Raipur", lat: 21.2514, lon: 81.6296, bbox: [80.24, 17.78, 84.4, 24.1] },
  { name: "Goa", type: "state", capital: "Panaji", lat: 15.4909, lon: 73.8278, bbox: [73.67, 14.89, 74.34, 15.8] },
  { name: "Gujarat", type: "state", capital: "Gandhinagar", lat: 23.2156, lon: 72.6369, bbox: [68.1, 20.1, 74.48, 24.71] },
  { name: "Haryana", type: "state", capital: "Chandigarh", lat: 30.7333, lon: 76.7794, bbox: [74.46, 27.65, 77.6, 30.93] },
  { name: "Himachal Pradesh", type: "state", capital: "Shimla", lat: 31.1048, lon: 77.1734, bbox: [75.58, 30.38, 79.0, 33.26] },
  { name: "Jharkhand", type: "state", capital: "Ranchi", lat: 23.3441, lon: 85.3096, bbox: [83.32, 21.96, 87.92, 25.35] },
  { name: "Karnataka", type: "state", capital: "Bengaluru", lat: 12.9716, lon: 77.5946, bbox: [74.05, 11.59, 78.59, 18.48] },
  { name: "Kerala", type: "state", capital: "Thiruvananthapuram", lat: 8.5241, lon: 76.9366, bbox: [74.85, 8.17, 77.42, 12.79] },
  { name: "Madhya Pradesh", type: "state", capital: "Bhopal", lat: 23.2599, lon: 77.4126, bbox: [74.03, 21.07, 82.82, 26.87] },
  { name: "Maharashtra", type: "state", capital: "Mumbai", lat: 19.076, lon: 72.8777, bbox: [72.6, 15.6, 80.9, 22.03] },
  { name: "Manipur", type: "state", capital: "Imphal", lat: 24.817, lon: 93.9368, bbox: [93.03, 23.83, 94.78, 25.7] },
  { name: "Meghalaya", type: "state", capital: "Shillong", lat: 25.5788, lon: 91.8933, bbox: [89.82, 25.03, 92.8, 26.12] },
  { name: "Mizoram", type: "state", capital: "Aizawl", lat: 23.7271, lon: 92.7176, bbox: [92.25, 21.94, 93.44, 24.53] },
  { name: "Nagaland", type: "state", capital: "Kohima", lat: 25.6751, lon: 94.1086, bbox: [93.32, 25.2, 95.25, 27.04] },
  { name: "Odisha", type: "state", capital: "Bhubaneswar", lat: 20.2961, lon: 85.8245, bbox: [81.38, 17.8, 87.5, 22.57] },
  { name: "Punjab", type: "state", capital: "Chandigarh", lat: 30.7333, lon: 76.7794, bbox: [73.87, 29.53, 76.94, 32.5] },
  { name: "Rajasthan", type: "state", capital: "Jaipur", lat: 26.9124, lon: 75.7873, bbox: [69.48, 23.06, 78.27, 30.2] },
  { name: "Sikkim", type: "state", capital: "Gangtok", lat: 27.3389, lon: 88.6065, bbox: [88.0, 27.07, 88.92, 28.13] },
  { name: "Tamil Nadu", type: "state", capital: "Chennai", lat: 13.0827, lon: 80.2707, bbox: [76.23, 8.07, 80.35, 13.57] },
  { name: "Telangana", type: "state", capital: "Hyderabad", lat: 17.385, lon: 78.4867, bbox: [77.23, 15.83, 81.33, 19.92] },
  { name: "Tripura", type: "state", capital: "Agartala", lat: 23.8315, lon: 91.2868, bbox: [91.15, 22.94, 92.34, 24.53] },
  { name: "Uttar Pradesh", type: "state", capital: "Lucknow", lat: 26.8467, lon: 80.9462, bbox: [77.08, 23.87, 84.64, 30.42] },
  { name: "Uttarakhand", type: "state", capital: "Dehradun", lat: 30.3165, lon: 78.0322, bbox: [77.57, 28.71, 81.05, 31.46] },
  { name: "West Bengal", type: "state", capital: "Kolkata", lat: 22.5726, lon: 88.3639, bbox: [85.82, 21.5, 89.88, 27.22] },

  // Union territories
  { name: "Andaman and Nicobar Islands", type: "ut", capital: "Sri Vijaya Puram", lat: 11.6234, lon: 92.7265, bbox: [92.2, 6.75, 93.96, 13.7] },
  { name: "Chandigarh", type: "ut", capital: "Chandigarh", lat: 30.7333, lon: 76.7794, bbox: [76.69, 30.66, 76.86, 30.8] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", capital: "Daman", lat: 20.3974, lon: 72.8328, bbox: [70.8, 20.0, 73.25, 20.75] },
  { name: "Delhi", type: "ut", capital: "New Delhi", lat: 28.6139, lon: 77.209, bbox: [76.84, 28.4, 77.35, 28.88] },
  { name: "Jammu and Kashmir", type: "ut", capital: "Srinagar", lat: 34.0837, lon: 74.7973, bbox: [73.7, 32.27, 76.8, 35.1] },
  { name: "Ladakh", type: "ut", capital: "Leh", lat: 34.1526, lon: 77.5771, bbox: [75.3, 32.3, 79.5, 35.7] },
  { name: "Lakshadweep", type: "ut", capital: "Kavaratti", lat: 10.5667, lon: 72.6417, bbox: [71.7, 8.2, 74.0, 12.4] },
  { name: "Puducherry", type: "ut", capital: "Puducherry", lat: 11.9416, lon: 79.8083, bbox: [79.6, 10.8, 79.9, 12.05] },
];

const DEFAULT_STATE = "Assam";

const byName = new Map(STATES.map(s => [s.name.toLowerCase(), s]));

function findState(name) {
  return byName.get(String(name || "").trim().toLowerCase()) || null;
}

// Reference places for "N km E of X" descriptions: every capital plus a few
// major cities so incidents get a nearby, recognisable landmark.
const REFERENCE_PLACES = {
  ...Object.fromEntries(STATES.map(s => [s.capital, { lat: s.lat, lon: s.lon }])),
  Guwahati: { lat: 26.1445, lon: 91.7362 },
  Dibrugarh: { lat: 27.4728, lon: 94.912 },
  Silchar: { lat: 24.8333, lon: 92.7789 },
  Tezpur: { lat: 26.6528, lon: 92.7926 },
  Jorhat: { lat: 26.7509, lon: 94.2037 },
  Siliguri: { lat: 26.7271, lon: 88.3953 },
  Varanasi: { lat: 25.3176, lon: 82.9739 },
  Nagpur: { lat: 21.1458, lon: 79.0882 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  Kochi: { lat: 9.9312, lon: 76.2673 },
  Madurai: { lat: 9.9252, lon: 78.1198 },
  Jabalpur: { lat: 23.1815, lon: 79.9864 },
  Jodhpur: { lat: 26.2389, lon: 73.0243 },
  Gorakhpur: { lat: 26.7606, lon: 83.3732 },
  Muzaffarpur: { lat: 26.1209, lon: 85.3647 },
  Sambalpur: { lat: 21.4669, lon: 83.9812 },
  Jammu: { lat: 32.7266, lon: 74.857 },
};

module.exports = { STATES, DEFAULT_STATE, findState, REFERENCE_PLACES };
