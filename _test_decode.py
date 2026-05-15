import sys
sys.stdout.reconfigure(encoding='utf-8')

s = "Выбрать файл"
# Try the inverse of the broken chain.
# Hypothesis: text was UTF-8, decoded as cp1251, re-encoded as UTF-8.
# To revert: encode as cp1251 -> decode as UTF-8
try:
    fixed = s.encode("cp1251").decode("utf-8")
    print("cp1251->utf-8:", fixed)
except Exception as e:
    print("err1:", e)

try:
    fixed = s.encode("latin-1").decode("utf-8")
    print("latin-1->utf-8:", fixed)
except Exception as e:
    print("err2:", e)
