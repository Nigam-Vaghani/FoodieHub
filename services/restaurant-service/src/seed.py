import logging
from sqlalchemy.orm import Session
from src.models import Restaurant, MenuItem

logger = logging.getLogger("restaurant-service")

def seed_restaurants(db: Session):
    existing_count = db.query(Restaurant).count()
    if existing_count > 0:
        logger.info(f"Restaurant database already contains {existing_count} restaurants. Skipping seed.")
        return

    logger.info("Seeding realistic sample restaurants and menu items...")

    restaurants_data = [
        {
            "name": "Bella Italia Trattoria",
            "description": "Authentic Italian wood-fired pizzas, artisanal pasta, and traditional desserts prepared with imported ingredients.",
            "cuisine_type": "Italian",
            "address": "42 Little Italy Way, Culinary District",
            "phone": "+1-555-0201",
            "rating": 4.8,
            "delivery_time_mins": 30,
            "delivery_fee": 2.99,
            "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
            "items": [
                {
                    "name": "Margherita D.O.P. Pizza",
                    "description": "San Marzano tomato sauce, fresh buffalo mozzarella, fresh basil, extra virgin olive oil.",
                    "price": 14.99,
                    "category": "Pizza",
                    "image_url": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "Diavola Spicy Salami Pizza",
                    "description": "Spicy Calabrian salami, smoked provolone, red chili flakes, crushed tomatoes.",
                    "price": 16.99,
                    "category": "Pizza",
                    "image_url": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Truffle Tagliatelle",
                    "description": "Handmade egg pasta tossed with black truffle butter sauce and aged Parmigiano Reggiano.",
                    "price": 18.50,
                    "category": "Pasta",
                    "image_url": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "Classic Tiramisu",
                    "description": "Espresso-soaked ladyfingers layered with rich mascarpone cream and dusted with dark cocoa.",
                    "price": 7.50,
                    "category": "Dessert",
                    "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "San Pellegrino Sparkling Mineral Water",
                    "description": "Crisp Italian sparkling mineral water (500ml).",
                    "price": 3.50,
                    "category": "Beverage",
                    "image_url": "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                }
            ]
        },
        {
            "name": "Spice Symphony Bistro",
            "description": "Vibrant and aromatic North and South Indian specialties crafted with freshly ground spices and clay tandoor ovens.",
            "cuisine_type": "Indian",
            "address": "88 Saffron Boulevard, Spice Plaza",
            "phone": "+1-555-0202",
            "rating": 4.9,
            "delivery_time_mins": 35,
            "delivery_fee": 3.49,
            "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            "items": [
                {
                    "name": "Butter Chicken Deluxe",
                    "description": "Tender grilled tandoori chicken simmered in a creamy, velvety spiced tomato fenugreek sauce.",
                    "price": 16.50,
                    "category": "Curry",
                    "image_url": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Paneer Tikka Masala",
                    "description": "Char-grilled cottage cheese cubes simmered with roasted bell peppers in a rich spiced gravy.",
                    "price": 14.99,
                    "category": "Curry",
                    "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "Hyderabadi Dum Biryani",
                    "description": "Aromatic long-grain basmati rice slow-cooked with marinated spices, fried onions, and saffron.",
                    "price": 15.99,
                    "category": "Rice & Biryani",
                    "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Garlic Butter Naan",
                    "description": "Traditional tandoor-baked flatbread brushed with garlic-infused butter and fresh cilantro.",
                    "price": 3.99,
                    "category": "Breads",
                    "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "Mango Lassi",
                    "description": "Creamy yogurt blended with sweet Alphonso mango pulp and a touch of cardamom.",
                    "price": 4.50,
                    "category": "Beverage",
                    "image_url": "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                }
            ]
        },
        {
            "name": "Sakura Japanese Craft & Sushi",
            "description": "Masterfully prepared sashimi, specialty maki rolls, and rich 24-hour tonkotsu broth ramen.",
            "cuisine_type": "Japanese",
            "address": "15 Cherry Blossom Ave, Lotus Bay",
            "phone": "+1-555-0203",
            "rating": 4.7,
            "delivery_time_mins": 25,
            "delivery_fee": 2.49,
            "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
            "items": [
                {
                    "name": "Dragon Roll (8 pcs)",
                    "description": "Crispy tempura shrimp and cucumber topped with sliced avocado, unagi eel sauce, and tobiko.",
                    "price": 15.50,
                    "category": "Sushi",
                    "image_url": "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Tokyo Tonkotsu Ramen",
                    "description": "Rich pork bone broth, tender chashu pork belly, ajitsuke tamago egg, nori, and scallions.",
                    "price": 16.00,
                    "category": "Ramen",
                    "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Pan-Fried Pork Gyoza (6 pcs)",
                    "description": "Crispy pan-seared Japanese dumplings served with scallion-sesame dipping sauce.",
                    "price": 7.99,
                    "category": "Appetizer",
                    "image_url": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Matcha Green Tea Mochi (3 pcs)",
                    "description": "Soft sweet rice cake filled with Japanese Uji matcha ice cream.",
                    "price": 6.00,
                    "category": "Dessert",
                    "image_url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                }
            ]
        },
        {
            "name": "Burger Craft Kitchen",
            "description": "Gourmet smash burgers, brioche buns, truffle fries, and handcrafted creamy milkshakes.",
            "cuisine_type": "American",
            "address": "210 Main Street, Metro Square",
            "phone": "+1-555-0204",
            "rating": 4.6,
            "delivery_time_mins": 25,
            "delivery_fee": 1.99,
            "image_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
            "items": [
                {
                    "name": "Truffle Bacon Cheeseburger",
                    "description": "Double Angus beef patties, smoked cheddar, crispy applewood bacon, and black truffle aioli.",
                    "price": 14.99,
                    "category": "Burgers",
                    "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Crispy Nashville Hot Chicken Sandwich",
                    "description": "Buttermilk fried chicken breast drenched in cayenne hot oil, tangy slaw, and pickles.",
                    "price": 13.50,
                    "category": "Sandwiches",
                    "image_url": "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": False,
                },
                {
                    "name": "Parmesan Truffle Fries",
                    "description": "Golden hand-cut fries tossed in white truffle oil, grated parmesan, and fresh parsley.",
                    "price": 6.99,
                    "category": "Sides",
                    "image_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                },
                {
                    "name": "Salted Caramel Shake",
                    "description": "Hand-spun vanilla bean ice cream with house salted caramel drizzle and whipped cream.",
                    "price": 5.99,
                    "category": "Beverage",
                    "image_url": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
                    "is_vegetarian": True,
                }
            ]
        }
    ]

    for rest_data in restaurants_data:
        items_data = rest_data.pop("items")
        restaurant = Restaurant(**rest_data)
        db.add(restaurant)
        db.flush()  # assign ID

        for item_data in items_data:
            item = MenuItem(restaurant_id=restaurant.id, **item_data)
            db.add(item)

    db.commit()
    logger.info(f"Successfully seeded {len(restaurants_data)} restaurants with complete menus.")
