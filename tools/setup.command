#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Карта тривог — налаштування (двічі клацніть цей файл у Finder)
#  1) зберігає токен alerts.in.ua у ~/.config/ua-alerts/token (доступ лише вам)
#  2) встановлює Übersicht, якщо його немає
#  3) копіює віджет у папку віджетів Übersicht і перезапускає його
# ─────────────────────────────────────────────────────────────
DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF="$HOME/.config/ua-alerts"
mkdir -p "$CONF" && chmod 700 "$CONF"

say() { osascript -e "display dialog \"$1\" buttons {\"OK\"} default button 1 with title \"Карта тривог\"" >/dev/null 2>&1; }

CUR=""; [ -s "$CONF/token" ] && CUR="(токен уже збережено — залиште поле порожнім, щоб не змінювати)"
TOKEN=$(osascript -e "text returned of (display dialog \"Вставте токен alerts.in.ua.\nОтримати його: alerts.in.ua/api-request\n$CUR\" default answer \"\" with hidden answer buttons {\"Скасувати\", \"Зберегти\"} default button 2 with title \"Карта тривог\")" 2>/dev/null) || TOKEN=""
TOKEN=$(printf '%s' "$TOKEN" | tr -d '[:space:]')

if [ -n "$TOKEN" ]; then
  code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' -H "Authorization: Bearer $TOKEN" https://api.alerts.in.ua/v1/alerts/active.json)
  if [ "$code" != "200" ]; then
    say "Токен не спрацював (відповідь сервера: $code). Перевірте, що скопіювали його повністю."
    exit 1
  fi
  ( umask 077; printf '%s' "$TOKEN" > "$CONF/token" )
  chmod 600 "$CONF/token"
fi

if [ ! -d "/Applications/Übersicht.app" ]; then
  if command -v brew >/dev/null 2>&1; then brew install --cask ubersicht
  else open "https://tracesof.net/uebersicht/"; say "Встановіть Übersicht (відкрив сторінку завантаження) і запустіть цей файл ще раз."; exit 1; fi
fi

W="$HOME/Library/Application Support/Übersicht/widgets"
mkdir -p "$W"
rm -rf "$W/alerts-map.widget"
cp -R "$DIR/alerts-map.widget" "$W/"
rm -rf /tmp/ua-alerts-api
killall Übersicht >/dev/null 2>&1; sleep 1; open -a "Übersicht"

if [ -s "$CONF/token" ]; then say "Готово! Токен збережено, віджет оновлено. Дані тепер з alerts.in.ua."
else say "Віджет оновлено. Без токена показуються лише тривоги по областях."; fi
