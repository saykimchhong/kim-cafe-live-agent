from google.genai import types

TOOL_DEFINITIONS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="navigate_screen",
                description="Navigate to a menu category screen on the kiosk display. Use this when the customer asks about a category of items.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "screen": types.Schema(
                            type=types.Type.STRING,
                            description="The screen to navigate to",
                            enum=["home", "coffee", "bakery", "cake", "food", "cart"],
                        ),
                    },
                    required=["screen"],
                ),
            ),
            types.FunctionDeclaration(
                name="highlight_item",
                description="Highlight a menu item with a glow effect to draw customer attention. Use when mentioning a specific item.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "item_id": types.Schema(
                            type=types.Type.STRING,
                            description="The item ID to highlight (e.g., 'coffee-latte', 'bakery-croissant')",
                        ),
                    },
                    required=["item_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="select_item",
                description="Open the detail modal for a menu item. Use when explaining item details or customizations.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "item_id": types.Schema(
                            type=types.Type.STRING,
                            description="The item ID to show details for",
                        ),
                    },
                    required=["item_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="close_detail",
                description="Close the item detail modal. Use after customer has seen the details or added item to cart.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={},
                ),
            ),
            types.FunctionDeclaration(
                name="add_to_cart",
                description="Add an item to the customer's cart. Use after customer confirms they want an item.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "item_id": types.Schema(
                            type=types.Type.STRING,
                            description="The item ID to add",
                        ),
                        "quantity": types.Schema(
                            type=types.Type.INTEGER,
                            description="Number of items to add",
                        ),
                        "customization": types.Schema(
                            type=types.Type.STRING,
                            description="Optional customization (e.g., 'Oat Milk', 'Extra Shot')",
                        ),
                    },
                    required=["item_id", "quantity"],
                ),
            ),
            types.FunctionDeclaration(
                name="remove_from_cart",
                description="Remove an item from the customer's cart.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "item_id": types.Schema(
                            type=types.Type.STRING,
                            description="The cart item ID to remove",
                        ),
                    },
                    required=["item_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="set_customer_info",
                description="Store customer information for the order. Call this when you learn the customer's name or observe their appearance.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "name": types.Schema(
                            type=types.Type.STRING,
                            description="Customer's name for the order",
                        ),
                        "appearance": types.Schema(
                            type=types.Type.STRING,
                            description="Visual description of customer (e.g., 'Person in green hoodie with glasses')",
                        ),
                        "table_or_location": types.Schema(
                            type=types.Type.STRING,
                            description="Table number or location description",
                        ),
                    },
                ),
            ),
            types.FunctionDeclaration(
                name="show_payment",
                description="Display the payment QR code screen. Use when the order is complete and customer is ready to pay.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "amount": types.Schema(
                            type=types.Type.NUMBER,
                            description="Total amount to charge",
                        ),
                    },
                    required=["amount"],
                ),
            ),
            types.FunctionDeclaration(
                name="submit_to_kitchen",
                description="Send the completed order to the kitchen after payment is confirmed.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "customer_name": types.Schema(
                            type=types.Type.STRING,
                            description="Customer's name",
                        ),
                        "customer_appearance": types.Schema(
                            type=types.Type.STRING,
                            description="Visual description to help staff find customer",
                        ),
                        "table_or_location": types.Schema(
                            type=types.Type.STRING,
                            description="Where to deliver the order",
                        ),
                    },
                    required=["customer_name", "customer_appearance"],
                ),
            ),
        ]
    )
]


def get_tool_definitions():
    return TOOL_DEFINITIONS
