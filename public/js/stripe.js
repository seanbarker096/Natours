/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

var stripe = Stripe(
  'pk_test_51I9fSqFVpNwDVwOzNeg6Ugfg7lw2GDA5bI9yyGvFBJ1Q5cN8ZIdZEGg58douRVUzNiRc3UWqcu1Ri9I7XLeYdh3q00PrXe3JBc'
);

export const bookTour = async (tourId) => {
  try {
    // get checkout session from backend
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);
    //use stripe object to create checkout form and charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
