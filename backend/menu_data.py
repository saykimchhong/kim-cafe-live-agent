MENU_ITEMS = [
    {
        "id": "coffee-espresso",
        "name": "Espresso",
        "category": "coffee",
        "price": 3.50,
        "description": "Rich and bold single shot espresso with a perfect crema.",
        "customizations": ["Extra Shot", "Decaf"],
    },
    {
        "id": "coffee-latte",
        "name": "Caffè Latte",
        "category": "coffee",
        "price": 4.50,
        "description": "Smooth espresso with steamed milk and light foam.",
        "customizations": ["Extra Shot", "Oat Milk", "Almond Milk", "Vanilla Syrup"],
    },
    {
        "id": "coffee-cappuccino",
        "name": "Cappuccino",
        "category": "coffee",
        "price": 4.50,
        "description": "Classic Italian coffee with equal parts espresso, steamed milk, and foam.",
        "customizations": ["Extra Shot", "Oat Milk", "Cinnamon Dust"],
    },
    {
        "id": "coffee-americano",
        "name": "Americano",
        "category": "coffee",
        "price": 3.75,
        "description": "Espresso diluted with hot water for a smooth, rich flavor.",
        "customizations": ["Extra Shot", "Iced"],
    },
    {
        "id": "coffee-mocha",
        "name": "Mocha",
        "category": "coffee",
        "price": 5.25,
        "description": "Espresso with chocolate and steamed milk topped with whipped cream.",
        "customizations": ["Extra Shot", "Oat Milk", "No Whip"],
    },
    {
        "id": "bakery-croissant",
        "name": "Butter Croissant",
        "category": "bakery",
        "price": 3.25,
        "description": "Flaky, buttery French pastry baked fresh every morning.",
        "customizations": ["Warmed"],
    },
    {
        "id": "bakery-muffin",
        "name": "Blueberry Muffin",
        "category": "bakery",
        "price": 3.50,
        "description": "Moist muffin loaded with fresh blueberries.",
        "customizations": ["Warmed"],
    },
    {
        "id": "bakery-danish",
        "name": "Apple Danish",
        "category": "bakery",
        "price": 3.75,
        "description": "Sweet pastry filled with spiced apple compote and drizzled with icing.",
        "customizations": ["Warmed"],
    },
    {
        "id": "bakery-bagel",
        "name": "Everything Bagel",
        "category": "bakery",
        "price": 2.75,
        "description": "Classic bagel with sesame, poppy, onion, and garlic.",
        "customizations": ["Cream Cheese", "Butter", "Toasted"],
    },
    {
        "id": "bakery-scone",
        "name": "Cranberry Scone",
        "category": "bakery",
        "price": 3.50,
        "description": "Tender British-style scone with sweet cranberries.",
        "customizations": ["Warmed", "Clotted Cream"],
    },
    {
        "id": "cake-cheesecake",
        "name": "New York Cheesecake",
        "category": "cake",
        "price": 6.50,
        "description": "Creamy classic cheesecake with graham cracker crust.",
        "customizations": ["Strawberry Topping", "Chocolate Drizzle"],
    },
    {
        "id": "cake-tiramisu",
        "name": "Tiramisu",
        "category": "cake",
        "price": 7.00,
        "description": "Italian dessert with espresso-soaked ladyfingers and mascarpone cream.",
        "customizations": [],
    },
    {
        "id": "cake-brownie",
        "name": "Fudge Brownie",
        "category": "cake",
        "price": 4.50,
        "description": "Dense chocolate brownie with a crisp top and gooey center.",
        "customizations": ["Warmed", "Ice Cream"],
    },
    {
        "id": "cake-carrot",
        "name": "Carrot Cake",
        "category": "cake",
        "price": 5.75,
        "description": "Spiced carrot cake layered with cream cheese frosting.",
        "customizations": [],
    },
    {
        "id": "cake-eclair",
        "name": "Chocolate Éclair",
        "category": "cake",
        "price": 4.75,
        "description": "Choux pastry filled with vanilla cream and topped with chocolate.",
        "customizations": [],
    },
    {
        "id": "food-sandwich",
        "name": "Turkey Club",
        "category": "food",
        "price": 9.50,
        "description": "Triple-decker sandwich with turkey, bacon, lettuce, and tomato.",
        "customizations": ["No Mayo", "Gluten-Free Bread"],
    },
    {
        "id": "food-salad",
        "name": "Caesar Salad",
        "category": "food",
        "price": 8.50,
        "description": "Crisp romaine with parmesan, croutons, and house Caesar dressing.",
        "customizations": ["Add Chicken", "Dressing on Side"],
    },
    {
        "id": "food-quiche",
        "name": "Spinach Quiche",
        "category": "food",
        "price": 7.25,
        "description": "French-style quiche with fresh spinach and gruyère cheese.",
        "customizations": ["Side Salad"],
    },
    {
        "id": "food-soup",
        "name": "Tomato Basil Soup",
        "category": "food",
        "price": 5.50,
        "description": "Creamy tomato soup with fresh basil and a hint of garlic.",
        "customizations": ["Bread Bowl", "Crackers"],
    },
    {
        "id": "food-wrap",
        "name": "Chicken Caesar Wrap",
        "category": "food",
        "price": 8.75,
        "description": "Grilled chicken with romaine and Caesar dressing in a flour tortilla.",
        "customizations": ["Gluten-Free Wrap", "Extra Dressing"],
    },
]


MENU_DICT = {item["id"]: item for item in MENU_ITEMS}


def get_menu_by_category(category: str) -> list:
    return [item for item in MENU_ITEMS if item["category"] == category]


def get_menu_item_by_id(item_id: str) -> dict | None:
    return MENU_DICT.get(item_id)


def get_menu_summary() -> str:
    summary = []
    for category in ["coffee", "bakery", "cake", "food"]:
        items = get_menu_by_category(category)
        item_list = ", ".join([f"{i['name']} (${i['price']:.2f})" for i in items])
        summary.append(f"{category.upper()}: {item_list}")
    return "\n".join(summary)
