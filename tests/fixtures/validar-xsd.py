# Valida um XML contra um XSD com lxml. Uso: python -P validar-xsd.py <arquivo.xsd> <arquivo.xml>
# Saída: "OK" ou a lista de erros do validador; código 0 (válido), 1 (inválido), 3 (lxml ausente).
import sys

try:
    from lxml import etree
except ImportError:
    print('lxml ausente: pip install lxml')
    sys.exit(3)

esquema = etree.XMLSchema(etree.parse(sys.argv[1]))
documento = etree.parse(sys.argv[2])
if esquema.validate(documento):
    print('OK')
    sys.exit(0)
for erro in esquema.error_log:
    print(f'linha {erro.line}: {erro.message}')
sys.exit(1)
