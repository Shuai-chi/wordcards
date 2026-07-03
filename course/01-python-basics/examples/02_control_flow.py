"""Module 1 範例:流程控制"""

score = 85
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"
print("grade:", grade)

fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print("fruit:", fruit)

for i in range(5):
    print("i:", i)

count = 0
while count < 3:
    print("count:", count)
    count += 1

for n in range(10):
    if n == 5:
        break
    if n % 2 == 0:
        continue
    print("odd n:", n)
