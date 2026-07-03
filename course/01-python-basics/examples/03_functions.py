"""Module 1 範例:函式與 lambda"""


def greet(name, greeting="Hello"):
    """基本函式,greeting 有預設值"""
    return f"{greeting}, {name}!"


def sum_all(*args):
    return sum(args)


def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")


if __name__ == "__main__":
    print(greet("Ada"))
    print(greet("Bob", greeting="Hi"))
    print("sum_all:", sum_all(1, 2, 3, 4))
    print_info(name="Ada", age=25)

    square = lambda x: x ** 2
    print("square(5):", square(5))

    users = [{"name": "Bob", "age": 30}, {"name": "Ada", "age": 25}]
    sorted_users = sorted(users, key=lambda u: u["age"])
    print("sorted_users:", sorted_users)
