/* eslint-disable */
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { priceId } = JSON.parse(event.body || '{}');
    if (!priceId) return { statusCode: 400, body: 'Missing priceId' };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: 'https://sentientiq.ai/thanks?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sentientiq.ai/pricing'
    });
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
