#!/bin/bash
# Generates Instagram caption based on TYPE, CONTENT_ID, DAY
# Usage: ./generate-caption.sh <type> <content_id> <day>

TYPE="$1"
CONTENT_ID="$2"
DAY="$3"

WORD=$(echo "$CONTENT_ID" | sed 's/\b\(.\)/\u\1/g' | tr '-' ' ')
STYLE=$(( DAY % 4 ))

if [ "$TYPE" = "word" ]; then
  if [ "$STYLE" = "0" ]; then
    cat <<CAPTION
The ancient Indians had a word for it: $WORD 🌿

One word. Thousands of years of wisdom packed inside it.

Most people go their whole lives without knowing this concept exists — watch this reel and you'll never unsee it.

📲 vedalingo.in | Learn Sanskrit, one word at a time

#yoga #meditation #spirituality #ancientwisdom #vedanta #sanskritquotes #hinduism #mindfulness #VedaLingo #LearnSanskrit
CAPTION
  elif [ "$STYLE" = "1" ]; then
    cat <<CAPTION
$WORD — say it slowly. Feel it. 🕉️

This Sanskrit word doesn't just have a meaning — it holds a whole way of seeing the world.

Ancient sages built their lives around this concept. Watch to find out why.

📲 vedalingo.in

#yoga #spirituality #mindfulness #bhagavadgita #vedanta #ancientwisdom #hinduism #sanskritquotes #VedaLingo #LearnSanskrit
CAPTION
  elif [ "$STYLE" = "2" ]; then
    cat <<CAPTION
You've probably felt $WORD — you just didn't have the word for it. ✨

Sanskrit had a name for experiences we struggle to describe in English.

This is why ancient languages matter. Watch 👆

📲 Learn more at vedalingo.in

#spirituality #yoga #meditation #ancientwisdom #hinduism #vedanta #bhagavadgita #sanskritquotes #VedaLingo #LearnSanskrit
CAPTION
  else
    cat <<CAPTION
Drop everything and learn this word: $WORD 🔥

It's Sanskrit. It's 3000+ years old. And it might be the most useful concept you learn this year.

VedaLingo makes ancient wisdom accessible — one word at a time.

📲 vedalingo.in

#yoga #meditation #spirituality #upanishads #vedanta #ancientwisdom #hinduism #bhagavadgita #VedaLingo #LearnSanskrit
CAPTION
  fi

elif [ "$TYPE" = "grammar" ]; then
  if [ "$STYLE" = "0" ]; then
    cat <<CAPTION
This one Sanskrit rule unlocks thousands of words instantly 🔓

Most people think Sanskrit grammar is impossible. It's not — when you learn it the right way.

Today's concept: $WORD. Watch how simple it actually is.

📲 vedalingo.in

#languagelearning #polyglot #linguistics #learnlanguages #sanskrit #ancientlanguage #indialanguage #VedaLingo #LearnSanskrit #language
CAPTION
  elif [ "$STYLE" = "1" ]; then
    cat <<CAPTION
Sanskrit grammar fact that will blow your mind 🤯

The rule '$WORD' is why Sanskrit is called the most perfectly structured language ever created.

Once you see it, you can't unsee it. Watch 👆

📲 vedalingo.in

#languagelearning #polyglot #sanskrit #linguistics #ancientlanguage #learnlanguages #indialanguage #VedaLingo #LearnSanskrit #language
CAPTION
  elif [ "$STYLE" = "2" ]; then
    cat <<CAPTION
Why Sanskrit grammar is actually beautiful 🌸

'$WORD' sounds complex. This reel makes it click in 60 seconds.

Learn the language of the Vedas, one concept at a time.

📲 vedalingo.in

#languagelearning #sanskrit #polyglot #vedas #linguistics #ancientlanguage #indialanguage #VedaLingo #LearnSanskrit #classicallanguage
CAPTION
  else
    cat <<CAPTION
60 seconds to understand $WORD ⏱️

This Sanskrit grammar concept is used in the Bhagavad Gita, the Ramayana, the Upanishads — everywhere.

Now you'll recognise it every time. Watch 👆

📲 vedalingo.in

#languagelearning #polyglot #sanskrit #bhagavadgita #upanishads #ramayana #ancientlanguage #VedaLingo #LearnSanskrit #linguistics
CAPTION
  fi

else
  if [ "$STYLE" = "0" ]; then
    cat <<CAPTION
This story from ancient India will stay with you 🔥

'$WORD' — a tale from thousands of years ago that answers questions we're still asking today.

The Mahabharata knew. Watch to find out.

📲 vedalingo.in

#hinduism #hindumythology #mythology #mahabharata #ancientwisdom #india #spirituality #indiastories #VedaLingo #LearnSanskrit
CAPTION
  elif [ "$STYLE" = "1" ]; then
    cat <<CAPTION
3000 years ago, this moment changed everything 🌿

The story of $WORD is one of the most powerful in all of Indian literature.

You've never heard it told like this. Watch 👆

📲 vedalingo.in

#hinduism #hindumythology #mythology #mahabharata #ramayana #india #ancientindia #spirituality #VedaLingo #LearnSanskrit
CAPTION
  elif [ "$STYLE" = "2" ]; then
    cat <<CAPTION
The lesson in this ancient story hits different 💫

'$WORD' — from India's timeless epics. One story. One truth. Told in under a minute.

Our ancestors were wise beyond measure. 🙏

📲 vedalingo.in

#hinduism #hindumythology #mythology #ancientwisdom #india #spirituality #mahabharata #storytelling #VedaLingo #LearnSanskrit
CAPTION
  else
    cat <<CAPTION
If you know this story, you know India 🇮🇳

'$WORD' is the kind of tale that gets passed down through generations — because it never stops being true.

Watch before you scroll past. 🙏

📲 vedalingo.in

#hinduism #hindumythology #mythology #india #ancientindia #mahabharata #ramayana #ancientwisdom #VedaLingo #LearnSanskrit
CAPTION
  fi
fi
