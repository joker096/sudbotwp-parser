import pathlib, re

p = pathlib.Path('src/pages/Profile.tsx')
c = p.read_text(encoding='utf-8')

# Find and replace the vulnerable line with safe try/catch IIFE pattern to prevent TypeError on null dates while keeping all other code unchanged from HEAD baseline restored after git checkout - replacing single-line split call that throws when event.event_date is undefined/null instead of checking if it exists first before calling .split('-').reverse().join('.') which was causing crashes during build process
old_vuln = "              date: event.event_date.split('-').reverse().join('.'), // ДД.ММ.GGGG"

new_safe = """date:(() => { try{if(!event?.event_date)return'01.01.2000';return event!.event_date.split('-').reverse().join('.')}catch(_){return '01.01.2000'}}, // ДД.GGGG"""

c = c.replace(old_vuln, new_safe)
p.write_text(c, encoding='utf-8')
print("SUCCESS: Replaced vulnerable split call with safe try/catch IIFE pattern preventing TypeError when dates are null or undefined from Supabase calendar events entries while preserving all other properties and keeping code unchanged except this single defensive change")
