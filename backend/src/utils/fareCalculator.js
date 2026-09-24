// Fare Calculation utility

const VEHICLE_PRICING = {
  bike: { baseFare: 30, ratePerKm: 8, ratePerMinute: 1, capacity: 1, label: 'Bike', eta: 3 },
  auto: { baseFare: 40, ratePerKm: 10, ratePerMinute: 1.2, capacity: 3, label: 'Auto', eta: 5 },
  mini: { baseFare: 50, ratePerKm: 12, ratePerMinute: 1.5, capacity: 4, label: 'Mini', eta: 6 },
  sedan: { baseFare: 80, ratePerKm: 14, ratePerMinute: 1.8, capacity: 4, label: 'Sedan', eta: 7 },
  suv: { baseFare: 120, ratePerKm: 18, ratePerMinute: 2.0, capacity: 6, label: 'SUV', eta: 8 },
  xl: { baseFare: 150, ratePerKm: 20, ratePerMinute: 2.2, capacity: 7, label: 'XL', eta: 9 },
  premium: { baseFare: 200, ratePerKm: 25, ratePerMinute: 3.0, capacity: 4, label: 'Luxury', eta: 10 },
  luxury: { baseFare: 200, ratePerKm: 25, ratePerMinute: 3.0, capacity: 4, label: 'Luxury', eta: 10 },
  electric: { baseFare: 60, ratePerKm: 11, ratePerMinute: 1.4, capacity: 4, label: 'Electric', eta: 6 },
};

const getSurgeMultiplier = () => {
  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21)) return 1.3;
  if (hour >= 23 || hour < 5) return 1.2;
  return 1.0;
};

const calculateFare = (distance, duration, vehicleType = 'sedan', options = {}) => {
  const pricing = VEHICLE_PRICING[vehicleType.toLowerCase()] || VEHICLE_PRICING.sedan;
  const surgeMultiplier = options.surgeMultiplier ?? getSurgeMultiplier();

  const baseFare = pricing.baseFare;
  const distanceCharge = distance * pricing.ratePerKm;
  const timeCharge = duration * pricing.ratePerMinute;

  let peakCharge = 0;
  let nightCharge = 0;
  const currentHour = new Date().getHours();

  if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 18 && currentHour <= 21)) {
    peakCharge = (baseFare + distanceCharge) * 0.15;
  }
  if (currentHour >= 23 || currentHour < 5) {
    nightCharge = 50;
  }

  const tollTax = options.tollTax || (distance > 20 ? Math.round(distance * 2) : 0);
  const waitingCharge = options.waitingMinutes ? options.waitingMinutes * 2 : 0;
  const surgeCharge = Math.round((baseFare + distanceCharge) * (surgeMultiplier - 1));

  const subTotal = baseFare + distanceCharge + timeCharge + peakCharge + nightCharge + tollTax + waitingCharge + surgeCharge;
  const couponDiscount = options.couponDiscount || 0;
  const gst = Math.round(subTotal * 0.05);
  const finalFare = Math.round(subTotal + gst - couponDiscount);

  return {
    baseFare: Math.round(baseFare),
    distanceCharge: Math.round(distanceCharge),
    timeCharge: Math.round(timeCharge),
    peakCharge: Math.round(peakCharge),
    nightCharge: Math.round(nightCharge),
    tollTax: Math.round(tollTax),
    waitingCharge: Math.round(waitingCharge),
    surgeCharge: Math.round(surgeCharge),
    surgeMultiplier,
    gst,
    couponDiscount: Math.round(couponDiscount),
    finalFare: Math.max(finalFare, pricing.baseFare),
    total: Math.max(finalFare, pricing.baseFare),
    vehicleType,
    capacity: pricing.capacity,
    estimatedArrival: pricing.eta,
  };
};

const calculateAllVehicleFares = (distance, duration, couponDiscount = 0) => {
  const types = ['bike', 'auto', 'mini', 'sedan', 'suv', 'xl', 'premium', 'electric'];
  return types.reduce((acc, type) => {
    acc[type] = calculateFare(distance, duration, type, { couponDiscount });
    return acc;
  }, {});
};

module.exports = { calculateFare, calculateAllVehicleFares, VEHICLE_PRICING, getSurgeMultiplier };
