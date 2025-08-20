import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SK);

export default async function handler(req, res) {
    // ✅ Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // ✅ Handle preflight request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { amount, currency = "usd", email = "", automatic_payment_methods } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        if (!email) return res.status(400).json({ error: "Email is required" });

        const customer = await stripe.customers.create({
            email,
            description: `Customer for ${email}`,
        });

        const paymentIntentParams = {
            amount: parseInt(amount),
            currency,
            customer: customer.id,
            metadata: { customer_email: email },
        };

        if (automatic_payment_methods) {
            paymentIntentParams.automatic_payment_methods = { enabled: true };
        } else {
            paymentIntentParams.payment_method_types = ["card"];
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        return res.status(200).json({
            client_secret: paymentIntent.client_secret,
            customer_id: customer.id,
            payment_intent_id: paymentIntent.id,
        });
    } catch (err) {
        console.error("Stripe Error:", err.message);
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
}
