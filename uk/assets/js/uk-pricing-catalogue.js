/**
 * CasePath UK pricing catalogue — England & Wales.
 * Display and selection only. No Stripe Price IDs exist for these plans.
 * Do not treat a selected id as paid entitlement.
 */
(function (w) {
  "use strict";

  var INDIVIDUAL = [
    {
      id: "uk_individual_1m",
      name: "1 Month",
      priceLabel: "£19.99",
      amountMinor: 1999,
      currency: "GBP",
      intervalMonths: 1,
      intervalLabel: "every 1 month",
      periodLabel: "1 month",
      effectiveMonthlyLabel: "£19.99/month",
      saveLabel: null,
      recurring: true,
      featured: false,
      stripePriceId: null
    },
    {
      id: "uk_individual_3m",
      name: "3 Months",
      priceLabel: "£49",
      amountMinor: 4900,
      currency: "GBP",
      intervalMonths: 3,
      intervalLabel: "every 3 months",
      periodLabel: "3 months",
      effectiveMonthlyLabel: "£16.33/month",
      saveLabel: "Save ~18%",
      recurring: true,
      featured: false,
      stripePriceId: null
    },
    {
      id: "uk_individual_6m",
      name: "6 Months",
      priceLabel: "£89",
      amountMinor: 8900,
      currency: "GBP",
      intervalMonths: 6,
      intervalLabel: "every 6 months",
      periodLabel: "6 months",
      effectiveMonthlyLabel: "£14.83/month",
      saveLabel: "Save ~26%",
      recurring: true,
      featured: false,
      stripePriceId: null
    },
    {
      id: "uk_individual_12m",
      name: "12 Months",
      priceLabel: "£149",
      amountMinor: 14900,
      currency: "GBP",
      intervalMonths: 12,
      intervalLabel: "every 12 months",
      periodLabel: "12 months",
      effectiveMonthlyLabel: "£12.42/month",
      saveLabel: "Save ~38%",
      recurring: true,
      featured: true,
      stripePriceId: null
    }
  ];

  var BUSINESS = [
    {
      id: "uk_firm_small",
      name: "Solo / small firm",
      seatsLabel: "1–9 seats",
      priceLabel: "£480",
      periodLabel: "per seat / year",
      minimumLabel: "£600 per firm / year",
      recurring: true,
      intervalLabel: "annual recurring",
      examples: [
        "1 seat = £600 minimum",
        "2 seats = £960",
        "5 seats = £2,400",
        "9 seats = £4,320"
      ],
      stripePriceId: null
    },
    {
      id: "uk_firm_mid",
      name: "Mid-market",
      seatsLabel: "10–49 seats",
      priceLabel: "£650",
      periodLabel: "per seat / year",
      minimumLabel: null,
      recurring: true,
      intervalLabel: "annual recurring",
      examples: ["10 seats = £6,500/year"],
      stripePriceId: null
    }
  ];

  var BY_ID = {};
  INDIVIDUAL.forEach(function (p) { BY_ID[p.id] = p; });
  BUSINESS.forEach(function (p) { BY_ID[p.id] = p; });

  w.CasePathUK = w.CasePathUK || {};
  w.CasePathUK.pricingCatalogue = {
    currency: "GBP",
    jurisdiction: "England & Wales",
    billingEnforced: false,
    checkoutAvailable: true,
    individual: INDIVIDUAL,
    business: BUSINESS,
    get: function (id) {
      return BY_ID[String(id || "")] || null;
    },
    isIndividual: function (id) {
      var p = BY_ID[String(id || "")];
      return !!(p && p.intervalMonths);
    }
  };
})(window);
