"""Module 1 範例:變數、資料型別與資料結構"""

# --- 基本型別 ---
age = 25
price = 19.99
name = "Ada"
is_active = True
print(type(age), type(price), type(name), type(is_active))

# --- list ---
fruits = ["apple", "banana", "cherry"]
fruits.append("date")
fruits[0] = "avocado"
print("fruits:", fruits)

# --- tuple ---
point = (3, 4)
print("point:", point)

# --- dict ---
user = {"name": "Ada", "age": 25, "email": "ada@example.com"}
user["age"] = 26
for key, value in user.items():
    print(f"{key}: {value}")

# --- set ---
tags = {"python", "sql", "aws"}
tags.add("linebot")
print("tags:", tags)

# --- comprehension ---
numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]
even_squares = [n ** 2 for n in numbers if n % 2 == 0]
print("squares:", squares)
print("even_squares:", even_squares)

word_lengths = {w: len(w) for w in fruits}
print("word_lengths:", word_lengths)
