export type FaqItem = {
  id: string;
  category: "getting-started" | "products-pricing" | "appointments" | "waybill-delivery";
  question: string;
  answer: string;
};
export const publicFaqs: FaqItem[] = [
  {id:"faq-1",category:"getting-started",question:"How do I enquire about a product?",answer:"Open a product, choose any available specifications and select Enquire on WhatsApp. Review and send the prepared message; an enquiry does not confirm a purchase."},
  {id:"faq-2",category:"products-pricing",question:"Are the prices final?",answer:"Published prices reflect the listed options. Ask KEO Hairven to confirm the current price and availability before making any payment."},
  {id:"faq-3",category:"appointments",question:"How do I choose the right length or texture?",answer:"Compare the specifications shown on each product page. If you need advice, describe your preferred look in a WhatsApp enquiry."},
  {id:"faq-4",category:"waybill-delivery",question:"Can you deliver to my location?",answer:"Share your destination during the WhatsApp conversation. Delivery coverage, fees and timing must be confirmed directly with KEO Hairven."},
  {id:"faq-5",category:"getting-started",question:"Where is KEO Hairven located?",answer:"KEO Hairven serves customers in Nigeria. Please request confirmed business location or delivery information before planning a visit."},
  {id:"faq-6",category:"getting-started",question:"Are the Lookbook pictures products I can order?",answer:"Lookbook imagery is inspiration and may not represent current inventory. Visit the published product catalogue for confirmed item information."},
  {id:"faq-7",category:"products-pricing",question:"Are you accepting online payments?",answer:"This website does not take online payments. All payment arrangements are handled directly with KEO Hairven after confirming your enquiry."},
];
export const faqCategories = [
  {id:"getting-started",label:"Getting started",target:"faq-1"},
  {id:"products-pricing",label:"Products & pricing",target:"faq-2"},
  {id:"appointments",label:"Choosing your hair",target:"faq-3"},
  {id:"waybill-delivery",label:"Delivery",target:"faq-4"},
] as const;
