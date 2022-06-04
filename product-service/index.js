const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const amqp = require("amqplib");
const Product = require('./Product');
const isAuthenticated  = require('../isAuthenticated');
const { json } = require('express');

const app = express()
const PORT = process.env.PORT_ONE ||  8080

app.use(express.json())

var channel, connection;

mongoose.connect("mongodb://localhost:27017/product-service-india",{
    useNewUrlParser: true,
    useUnifiedTopology: true
}, () => {
    console.log(`Product-service DB Connected`);
})


async function connect() {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
}
connect();

// create a new product
// Buy a product 

app.post("/product/create", isAuthenticated, async (req, res) => {
    // req.user.email 
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price
    })
    newProduct.save()
    return res.json(newProduct)
})

// user send a list of product's IDs to buy
// Create an order with those products and a total value od sum of product's prices

var order;

app.post("/product/buy", isAuthenticated, async (req, res) => {
    const { ids } = req.body
    const products = await Product.find({ _id: {$in: ids}});
    channel.sendToQueue("ORDER", Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    )
    channel.consume("PRODUCT", (data) => {
        console.log("Consuming PRODUCT queue");
        order = JSON.parse(data.content)
        channel.ack(data);
        // console.log(order);
        
    })
    
    return res.json(order);
    // return 10;
})


app.listen(PORT, ()=>{
    console.log(`Server product-service run on port ${PORT}`);
})                                                 