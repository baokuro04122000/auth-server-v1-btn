const paypal = require('../middlewares/paypal.middleware')
var that = module.exports = {
  createPayPalPayment :async (req, res) => {
    const {paymentType} = req.body
    
    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": paymentType
      },
      "redirect_urls": {
          "return_url": process.env.REDIRECT_PAYPAL_SUCCESS,
          "cancel_url": process.env.REDIRECT_PAYPAL_CANCEL
      },
      "transactions": [
        {
          "amount": {
              "currency": "USD",
              "total": "200.00",
              "details": {
                  "shipping": "10.00",
                  "subtotal": "190.00"
              }
          },
          "item_list": {
              "items": [
                  {
                      "name": "Foto 1",
                      "currency": "USD",
                      "sku": "123",
                      "quantity": "1",
                      "price": "190.00"
                  }
              ]
          },
          "description": "Payment description"
        }
      ]
    }
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          console.log(error)
          throw error;
      } else {
        console.log(payment)
          payment.links.forEach((link) => {
            if(link.rel === 'approval_url') return res.redirect(link.href) 
          })
      }
    });
  },
  paypalPaymentSuccess: async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
            "currency": "USD",
            "total": "200.00"
          }
      }]
    };

    // Obtains the transaction details from paypal
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
      if (error) {
          console.log(error.response);
          throw error;
      } else {
          console.log(JSON.stringify(payment));
          res.send('Success');
      }
    });
  },
  paypalPaymentCancel: async (req, res) => {
    res.send('Cancelled')
  }
}