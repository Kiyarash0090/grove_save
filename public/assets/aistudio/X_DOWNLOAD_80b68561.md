# متد دانلود از X (Twitter) — پردازش لینک و فرآیند دانلود

این سند فقط مسیر فنی دانلود از X را توضیح می‌دهد: لینک‌ها چطور شناسایی و دسته‌بندی می‌شوند، دادهٔ پست از کجا می‌آید، رسانه چطور انتخاب و اعتبارسنجی می‌شود و چه زمانی به `yt-dlp` پناه برده می‌شود.

کد مرتبط:
- [main.py](main.py) — تشخیص لینک، بررسی دسترسی، مسیریابی پروفایل/پست و کنترل هم‌زمانی
- [x_downloader.py](x_downloader.py) — واکشی داده، استخراج مدیا، ساخت کپشن، ارسال و پاک‌سازی

---

## ۱. شناسایی لینک

در [main.py:3649](main.py:3649) هندلر با یک regex ساده روی پیام‌های متنی فیلتر می‌شود:

```python
@app.on_message(filters.incoming & filters.text & (filters.private | filters.group)
                & filters.regex(r"https?://(?:www\.)?(?:twitter|x)\.com/[^\s]+"))
```

سپس دو الگوی دقیق‌تر نوع لینک را تعیین می‌کنند ([x_downloader.py:27](x_downloader.py:27)):

```python
TWITTER_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?(?:twitter|x)\.com/(?P<user>[^/]+)/status/(?P<tweet_id>\d+)',
    re.IGNORECASE,
)
PROFILE_URL_PATTERN = re.compile(
    r'https?://(?:www\.)?(?:twitter|x)\.com/(?P<username>[A-Za-z0-9_]{1,15})(?:/)?(?:\?.*)?$',
    re.IGNORECASE,
)
```

| الگو | شرط | نتیجه |
|---|---|---|
| `TWITTER_URL_PATTERN` | مسیر `/<anything>/status/<عدد>` | پست — `tweet_id` استخراج می‌شود |
| `PROFILE_URL_PATTERN` | مسیر فقط یک یوزرنیم ۱ تا ۱۵ کاراکتری و پایان رشته | پروفایل — `username` استخراج می‌شود |
| هیچ‌کدام | مسیرهایی مثل `/i/communities/...` یا `/hashtag/...` | تلاش به‌عنوان پست (بدون `tweet_id` معتبر) |

نکته‌های مهم:

1. هم `twitter.com` و هم `x.com` پذیرفته می‌شوند، با یا بدون `www.`، و بدون حساسیت به حروف بزرگ/کوچک.
2. `tweet_id` الزاماً عدد است (`\d+`). شناسهٔ عددی پایهٔ همهٔ مراحل بعدی است.
3. از کل متن پیام **فقط اولین** لینک استفاده می‌شود ([main.py:3672](main.py:3672)) و علائم پایانی با `rstrip(".,!?)]\'\"")` حذف می‌شوند.
4. `PROFILE_URL_PATTERN` فقط وقتی می‌گیرد که لینک به `/` ختم شود یا تمام رشته باشد — پس لینک‌هایی با مسیر اضافه به‌عنوان پروفایل شناسایی نمی‌شوند.

---

## ۲. شاخه‌بندی: پروفایل یا پست

پس از استخراج لینک و عبور از بررسی دسترسی (مسدود نبودن و شرایط عضویت)، شاخه‌بندی در `handle_x_download` انجام می‌شود ([main.py:3693](main.py:3693)):

```python
if is_twitter_profile_url(x_url):
    # دریافت اطلاعات پروفایل — بدون دانلود رسانه
else:
    success = await download_x_post(...)   # دانلود پست
```

- **پروفایل**: `get_profile_data` صدا زده می‌شود و کارت اطلاعات حساب با عکس آواتار ارسال می‌گردد. هیچ رسانه‌ای دانلود نمی‌شود.
- **پست**: مسیر کامل دانلود طی می‌شود.

در هر دو حالت، پیام لینک کاربر **فقط وقتی** حذف می‌شود که عملیات موفق باشد (`safe_delete_link_message`). در شکست، لینک کاربر باقی می‌ماند و پیام خطا ریپلای می‌شود.

---

## ۳. منابع داده: fxtwitter + Syndication

منبع اصلی داده دو API نیمه‌عمومی است، نه اسکرپ صفحهٔ X. تابع `get_tweet_data` هر دو را موازی می‌گیرد و ادغام می‌کند ([x_downloader.py:242](x_downloader.py:242)):

### الف) fxtwitter — منبع آمار و متن کامل

```python
GET https://api.fxtwitter.com/i/status/{tweet_id}
```

- بدون کوکی زده می‌شود (`_fetch_json_no_cookie`) تا در صورت مشکل در کوکی‌ها/سشن کاربر، این مسیر سالم بماند.
- از خروجی، شاخهٔ `tweet` برداشته می‌شود.

### ب) Syndication — منبع آدرس رسانه

```python
GET https://cdn.syndication.twimg.com/tweet-result?id={tweet_id}&token=0
```

- با کوکی و `Referer: https://x.com/` زده می‌شود.
- درخواستی است که خود وب‌سایت X برای embed استفاده می‌کند. `token=0` مقدار ثابت است و به احراز هویت نیاز ندارد.

### ادغام این دو

پایهٔ `tweet_data` از Syndication ساخته می‌شود و fxtwitter روی آن اعمال می‌شود:

| فیلد | منبع | منطق |
|---|---|---|
| متن | fxtwitter | **مقایسهٔ طول**، نه خالی‌بودن: `if len(fx_text) > len(current_text)`. برای note tweet (توییت بلند > ۲۸۰ کاراکتر) Syndication فقط بخش اول را می‌دهد و fxtwitter کامل را دارد |
| آمار (لایک، ریپلای، ریتوییت) | fxtwitter اولویت | `fx.get("likes") or syndication.get("favorite_count")` |
| کاربر | fxtwitter تکمیل می‌کند | `screen_name` دقیق‌تر از fxtwitter |
| رسانه | fxtwitter (اگر داشته باشد) | برای پست‌های age-restricted، Syndication یک **tombstone** بدون رسانه برمی‌گرداند و fxtwitter تنها منبع لینک ویدیو است |
| تاریخ | هرکدام موجود بود | fallback دوطرفه |

اگر **هر دو** شکست بخورند، `get_tweet_data` مقدار `None` برمی‌گرداند.

### نگاشت لینک‌های کوتاه (t.co)

X همهٔ لینک‌های داخل متن را به `t.co` کوتاه می‌کند. fxtwitter یک نگاشت آماده در `raw_text.facets` می‌دهد که همهٔ `original → replacement` را دارد؛ این در `tweet_data["_link_map"]` ذخیره می‌شود. این نگاشت بعداً در `_resolve_links` استفاده می‌شود.

### ریپلای و نقل‌قول

از هر دو منبع استخراج می‌شوند و به `reply_to_url` / `quote_url` تبدیل می‌گردند تا در کپشن به‌صورت لینک مرتبط نمایش داده شوند. اگر `screen_name` عددی بود (حالت خاص Syndication)، به `"i"` نگاشت می‌شود چون آدرس `/i/status/<id>` هم کار می‌کند.

---

## ۴. استخراج رسانه از دادهٔ خام

پست X ممکن است در چند ساختار مختلف رسانه داشته باشد (بسته به این‌که Syndication یا fxtwitter جواب داده). `_collect_tweet_media` همهٔ آن‌ها را بررسی و نرمال می‌کند ([x_downloader.py:836](x_downloader.py:836)):

| ساختار | منبع | فیلدهای شناخته‌شده |
|---|---|---|
| `media.all[]` | fxtwitter | `url`, `type`, `formats[]` |
| `photos[]` | Syndication | رشته یا dict با `url` / `media_url_https` |
| `mediaDetails[]` | Syndication | `type`, `media_url_https`, `video_info.variants[]` |
| `video` / `videos` | انواع fallback | رشته یا dict |

### انتخاب نسخهٔ ویدیو

برای ویدیو، `_choose_video_url` از `video_info.variants` لیست می‌گیرد و **اولین variant با `content_type == "video/mp4"`** را انتخاب می‌کند؛ اگر mp4 نبود، اولین variant موجود. X برای هر ویدیو چند کیفیت (m3u8 و mp4 با بیت‌ریت‌های مختلف) می‌دهد و mp4 برای ارسال مستقیم لازم است.

برای دادهٔ fxtwitter هم همین منطق: آدرس اصلی امتحان می‌شود، و اگر mp4 نبود، از `formats[]` یک آدرس `.mp4` پیدا می‌شود؛ در نهایت اگر هیچ mp4 نبود همان m3u8 استفاده می‌شود.

### GIFهای X

GIF در X در واقع یک فایل **mp4** است (`tweet_video/*.mp4`) و نوعش `gif` یا `animated_gif` گزارش می‌شود. به همین دلیل:

```python
_VIDEO_MEDIA_TYPES = frozenset({"video", "gif", "animated_gif"})
```

این مجموعه همه‌جا استفاده می‌شود: در انتخاب نسخه، در اعتبارسنجی جادویی‌بایت‌ها و در انتخاب `InputMediaVideo` به‌جای `InputMediaPhoto`. بدون این، GIF با بررسی جادویی‌بایت عکس رد می‌شد و «مدیای نامعتبر» تلقی می‌گشت.

### حذف تکراری‌ها

یک ویدیوی تکی در X با URLهای متفاوت برای هر رزولوشن در دو منبع ظاهر می‌شود. اگر بر اساس URL کامل dedupe می‌کردیم، یک ویدیو به آلبوم دو-عضوی تبدیل می‌شد و ارسال آلبوم برای یک آیتم خطا می‌داد. بنابراین `_media_identity` از شناسهٔ خود فایل استفاده می‌کند:

```python
_VIDEO_MEDIA_ID_RE = re.compile(r'(?:amplify_video|ext_tw_video|tweet_video)/([A-Za-z0-9_-]+)')
_PHOTO_MEDIA_ID_RE = re.compile(r'pbs\.twimg\.com/(?:media|ext_tw_video_thumb|amplify_video_thumb)/([A-Za-z0-9_-]+)')
```

یعنی کلید یکتایی `("video", <media_id>)` یا `("photo", <media_id>)` است، نه URL. این شناسه در همهٔ رزولوشن‌ها و در هر دو API یکسان است.

---

## ۵. دانلود بایت‌های رسانه

برخلاف تیک‌تاک که فایل را روی دیسک می‌ریزد، X مستقیم در حافظه دانلود می‌کند ([x_downloader.py:733](x_downloader.py:733)):

```python
async with session.get(url, headers={"Referer": "https://x.com/", "Cookie": ...}) as response:
    return await response.read()
```

- `Referer: https://x.com/` برای CDNهای `twimg.com` لازم است؛ بدون آن برخی آدرس‌ها ۴۰۳ می‌دهند.
- از یک `aiohttp.ClientSession` مشترک استفاده می‌شود که در طول عمر پروسه باز می‌ماند (connector با `limit=100`، `ttl_dns_cache=300`). ساختن session برای هر درخواست، هر بار handshake و کانکشن‌پول تازه می‌ساخت.
- نتیجه به‌صورت `BytesIO` و با نام ساختگی (`x_video_<i>.mp4` / `x_photo_<i>.jpg`) به Pyrogram داده می‌شود؛ همین نام باعث می‌شود Pyrogram نوع فایل را درست تشخیص دهد.

### اعتبارسنجی جادویی‌بایت

CDN گاهی به‌جای فایل، یک صفحهٔ HTML خطا برمی‌گرداند. `_looks_like_media` قبل از هر ارسال، امضای فایل را بررسی می‌کند ([x_downloader.py:796](x_downloader.py:796)):

| نوع | امضا |
|---|---|
| ویدیو | `data[4:8] == b"ftyp"` (ISO-BMFF) یا شروع با `\x1aE\xdf\xa3` (Matroska) |
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| GIF | `GIF87a` / `GIF89a` |
| WebP | `RIFF....WEBP` |

اگر امضا مطابقت نداشت، آیتم رد می‌شود و لاگ حجم و ۱۶ بایت اول ثبت می‌شود. این جلوی ارسال صفحهٔ خطای HTML به‌جای ویدیو را می‌گیرد.

---

## ۶. کپشن

`build_caption` ([x_downloader.py:549](x_downloader.py:549)) کپشن را از فیلدهای `tweet_data` می‌سازد، با ترتیب ثابت:

1. **بلوک «Downloaded by»** — نام فرستندهٔ لینک به‌صورت منشن کلیک‌پذیر (`tg://user?id=`).
2. **Post Link** — هایپرلینک روی آدرس پستی که کاربر فرستاده.
3. **در پاسخ به** — اگر پست ریپلای است، لینک پست والد با منشن صاحبش.
4. **نقل‌قول از** — اگر پست کوئیت است، لینک پست نقل‌شده.
5. **Creator** — یوزرنیم نویسنده.
6. **آمار** — `❤️ Likes | 💬 Replies | 🔁 Retweets` (هر سه با پیش‌فرض صفر).
7. **Date** — تاریخ پست در صورت وجود.
8. **متن پست** با پیشوند `✏️`.
9. **خط جداکننده + برندینگ**.

### بازسازی متن (`_resolve_links`)

متن خام X پر از `t.co` است. این تابع ([x_downloader.py:465](x_downloader.py:465)):

- `display_text_range` را اعمال می‌کند تا پیشوند ریپلای (`@user `) از متن حذف شود — اما فقط اگر آن برش متن را کوتاه نکند. برای note tweet این بازه فقط ۲۸۰ کاراکتر اول را پوشش می‌دهد و اعمال کورکورانه متن کامل fxtwitter را می‌برد.
- `link_map` را از `_link_map` و `entities.urls` می‌سازد و هر `t.co` را با آدرس مقصد جایگزین می‌کند — به‌جای حذف کردن، که قبلاً لینک‌های داخل متن را نامرئی می‌کرد.
- لینک‌های **رسانه** (`pic.x.com/.../video/1` و `.../photo/...`) حذف می‌شوند چون فایل جداگانه ارسال می‌شود و تکرارشان بی‌معنی است.
- `t.co`هایی که نگاشتشان پیدا نشده حذف می‌شوند اگر رسانه باشند، وگرنه دست‌نخورده می‌مانند.
- خطوط خالی پشت‌سرهم به حداکثر یک خط خالی جمع می‌شوند.

### سقف ۱۰۲۴ کاراکتر و متن اضافه

کپشن تلگرام حداکثر ۱۰۲۴ کاراکتر است. `build_caption`:

- بخش ثابت (آمار، لینک، فوتر) را **قبل از** متن پست می‌چیند و **جای باقی‌مانده** را حساب می‌کند: `remaining = limit - len(body) - len(prefix) - len(footer) - 1`
- فقط اگر `remaining > 40` باشد متن را اضافه می‌کند؛ در غیر این صورت متن پست کلاً در کپشن نمی‌آید و به پیام اضافه می‌رود.
- `_safe_truncate_html` متن را بدون شکستن تگ HTML و بدون بریدن وسط موجودیت (`&amp;`) می‌برد؛ اگر واقعاً کوتاه شد، `...` می‌گذارد.
- فوتر همیشه حفظ می‌شود — به همین دلیل جدا از `body` ساخته می‌شود.

بقیهٔ متن با `build_caption_overflow` محاسبه و با `_send_overflow_text` در پیام‌های جدا (هر ۴۰۹۶ کاراکتر، ترجیحاً روی مرز خط) فرستاده می‌شود. محاسبهٔ باقی‌مانده از روی **متن واقعیِ داخل کپشن** انجام می‌شود (`_caption_used_text` علامت `✏️` تا خط جداکننده را می‌خواند)، نه با حدس زدن مقدار بریده‌شده.

---

## ۷. مسیرهای ارسال

`download_x_post` ([x_downloader.py:1027](x_downloader.py:1027)) بر اساس تعداد آیتم‌های رسانه شاخه می‌زند.

### الف) پست بدون رسانه (فقط متن/لینک)

قبل از هر تلاشی به `yt-dlp`، بررسی می‌شود که پست واقعاً رسانه ندارد:

```python
has_media_hint = _tweet_has_media_hint(tweet_data)
if tweet_data and not media_items and not has_media_hint:
    # فقط کپشن بفرست، yt-dlp را صدا نزن
```

`_tweet_has_media_hint` وجود هر ردیف رسانه (حتی بدون URL)، `video`/`videos` غیرخالی یا فلگ `possibly_sensitive` را «نشانهٔ رسانه» می‌داند. بدون این بررسی، پست متنی به `yt-dlp` می‌رفت، شکست می‌خورد و کاربر هیچ چیزی نمی‌گرفت. در این حالت فقط کپشن با `disable_web_page_preview=False` ارسال و در دیتابیس به‌عنوان `text` ثبت می‌شود.

### ب) یک آیتم رسانه

هر آیتم جداگانه دانلود و ارسال می‌شود؛ کپشن فقط روی آیتم اول (`index == 0`). ویدیو با `send_video`, عکس با `send_photo`.

### ج) چند آیتم رسانه — آلبوم

- آلبوم **۸تایی** ساخته می‌شود (`ALBUM_SIZE = 8`).
- هر بَچ **جداگانه دانلود و ارسال** می‌شود و بافر حافظه پس از هر بَچ `clear()` می‌شود. دلیلش در کامنت کد آمده: نگه‌داشتن همهٔ رسانه‌ها یک‌جا، با یک آلبوم ویدیویی مصرف RAM سرور را چند برابر می‌کرد.
- کپشن فقط روی **اولین آیتمِ واقعاً ارسالی** می‌رود — با شرط `if not media_group` روی طول فعلی، نه روی `offset`. این‌طور اگر آیتم اول به‌خاطر مدیای نامعتبر رد شود، کپشن از دست نمی‌رود.
- بین بَچ‌ها ۱ ثانیه تأخیر.
- آلبوم می‌تواند **مخلوط عکس و ویدیو** باشد (`InputMediaPhoto` و `InputMediaVideo` در یک `media_group`).
- هر آیتم ارسالی یک رکورد `add_download` جدا می‌گیرد.

### د) Fallback به yt-dlp

در دو نقطه فراخوانی می‌شود:

1. **`tweet_data` نداریم یا `media_items` خالی است** (خط ~۱۰۵۵): یعنی Syndication و fxtwitter هیچ‌کدام دادهٔ قابل‌استفاده ندادند.
2. **همهٔ آیتم‌های آلبوم در اعتبارسنجی رد شدند** (`not any_downloaded`): یعنی URLها داشتیم ولی هیچ‌کدام فایل واقعی نبودند.

`_download_via_ytdlp` ([x_downloader.py:907](x_downloader.py:907)):

```python
format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
outtmpl: <tmpdir>/<tweet_id>.%(ext)s
cookiefile: cookies.txt (اگر موجود باشد)
```

- در یک `tempfile.mkdtemp(prefix="x_dl_")` جدا کار می‌کند.
- در thread جداگانه اجرا می‌شود (`run_in_executor`) چون `yt_dlp` مسدودکننده است.
- اگر فایل با پسوند پیش‌بینی‌شده نبود، اولین فایل موجود در پوشه برداشته می‌شود (چون `bestvideo+bestaudio` ممکن است پسوند نهایی را تغییر دهد).
- از `info` برگشتی یک `tweet_data` مینیمال ساخته می‌شود (`description` به‌جای متن، `uploader`/`uploader_id` به‌جای کاربر، `like_count`/`repost_count` برای آمار) — چون صفحهٔ X در دسترس نبوده، این تنها دادهٔ موجود است.
- `tweet_data` اصلی (اگر داشتیم) فیلدهای خالی این ساختار را پر می‌کند.
- در `finally` پوشهٔ موقت با `shutil.rmtree` پاک می‌شود.

---

## ۸. کوکی‌ها

X برخلاف تیک‌تاک از کوکی استفاده می‌کند ([x_downloader.py:98](x_downloader.py:98)):

- فایل: `cookies.txt` کنار `x_downloader.py`، و اگر نبود در working directory.
- فرمت: **Netscape** (خطوط جداشده با tab، حداقل ۷ فیلد؛ فیلد ۶ نام کوکی و فیلد ۷ مقدار).
- خطوط خالی و شروع‌شده با `#` نادیده گرفته می‌شوند.
- نتیجه در متغیر ماژول‌سطح `_cookie_header_cache` کش می‌شود و به هر درخواست به‌صورت هدر `Cookie: name=value; name2=value2` اضافه می‌گردد.
- آپلود کوکی جدید در `main.py:2395` انجام می‌شود و پس از ذخیره، `reload_cookies()` فراخوانی می‌شود که کش را پاک می‌کند تا درخواست بعدی فایل تازه را بخواند — بدون نیاز به ری‌استارت.
- مسیر fxtwitter **عمداً** کوکی نمی‌فرستد (`_fetch_json_no_cookie`) تا این منبع مستقل از سلامت کوکی‌ها باقی بماند.
- TLS در این ماژول تأیید نمی‌شود (`ssl.CERT_NONE` و `verify=False` در fallback) تا در محیط‌هایی که زنجیرهٔ گواهی ناقص است کار کند.

---

## ۹. مقاوم‌سازی شبکه

سه لایه fallback برای هر درخواست وجود دارد:

1. **`aiohttp` با session مشترک** — مسیر اصلی. مشکل: در برخی پاسخ‌های X با هدرهای بسیار بلند، parser شکست می‌خورد.
2. **`requests` همگام در `run_in_executor`** — برای همان موارد؛ کد صریحاً می‌گوید `aiohttp/httptools may fail on some responses (very long header values)`.
3. **تکرار با تایم‌اوت کوتاه‌تر** — `_fetch_json` و `_fetch_text` هر دو تایم‌اوت ۲۰ ثانیه دارند و `_download_media_bytes` ۳۰ ثانیه.

همچنین برای JSON بررسی می‌شود که `content-type` حاوی `application/json` باشد؛ اگر X صفحهٔ HTML چالش برگرداند، مقدار `None` برمی‌گردد تا مسیر fallback فعال شود.

---

## ۱۰. کنترل هم‌زمانی و ثبت

- همهٔ لینک‌های X زیر همان `DOWNLOAD_SEMAPHORE = asyncio.Semaphore(10)` اجرا می‌شوند که کل ربات (تیکتاک، پینترست، X) را محدود می‌کند ([main.py:102](main.py:102)).
- ثبت در دیتابیس با پلتفرم `"x"` و نوع رسانه:

| وضعیت | file_type |
|---|---|
| `success` | `photo` / `video` / `gif` / `animated_gif` (همان `type` آیتم) / `text` |
| `failed` | `None` |

- `add_download` در بلوک `try/except` جدا پیچیده شده و شکست ثبت هرگز روی دانلود اثر نمی‌گذارد.

---

## ۱۱. پروفایل

`get_profile_data` ([x_downloader.py:344](x_downloader.py:344)) دو روش دارد:

### روش اول — fxtwitter

```python
GET https://api.fxtwitter.com/{username}
```

نگاشت فیلدها:

| خروجی API | فیلد داخلی |
|---|---|
| `user.name` | `name` |
| `user.screen_name` | `screen_name` |
| `user.description` | `description` |
| `user.avatar_url` | `profile_image_url_https` |
| `user.followers` | `followers_count` |
| `user.following` | `friends_count` |
| `user.tweets` | `statuses_count` |
| `user.verified` | `verified` |

آواتار با regex به بزرگ‌ترین اندازه ارتقا داده می‌شود:

```python
re.sub(r'_(normal|bigger|mini|200x200)(\.(?:jpg|jpeg|png|gif))', r'_400x400\2', avatar)
```

### روش دوم — اسکرپ HTML (fallback)

اگر fxtwitter چیزی نداد، صفحهٔ `https://x.com/<username>` گرفته و متا تگ‌ها خوانده می‌شوند: `og:title` (نام), `og:description` (بیو), `og:image` (آواتار). مقادیر با `html.unescape` دیکد می‌شوند.

---

## ۱۲. خطاها

| موقعیت | رفتار |
|---|---|
| هر دو API داده ندادند | `get_tweet_data` → `None` → تلاش `yt-dlp` |
| Syndication داده داد ولی رسانه نداشت و پست هم نشانهٔ رسانه نداشت | فقط کپشن ارسال، ثبت به‌عنوان `text` |
| URL رسانه هست ولی فایل HTML جای آن آمد | آیتم با `_looks_like_media` رد می‌شود؛ اگر همه رد شدند → `yt-dlp` |
| `yt-dlp` هم شکست خورد | `failed` در دیتابیس، `False` برمی‌گردد، لینک کاربر حذف نمی‌شود، پیام خطا ریپلای می‌شود |
| ارسال به تلگرام خطا داد | لاگ و `False` |
| دانلود رسانه از CDN خطا داد | `_download_media_bytes` → `None`، آیتم رد می‌شود |

---

## ۱۳. خلاصهٔ جریان کامل

```
پیام حاوی لینک
   │
   ├─ regex: https?://(?:www\.)?(?:twitter|x)\.com/[^\s]+
   ├─ اولین لینک، rstrip علائم پایانی
   ├─ بررسی مسدود بودن + عضویت اجباری
   ├─ semaphore(10)
   │
   ├─ PROFILE_URL_PATTERN؟ ─── بله → fxtwitter /profile → کارت پروفایل + آواتار ۴۰۰×۴۰۰
   │
   └─ نه → download_x_post
        ├─ tweet_id از TWITTER_URL_PATTERN
        ├─ get_tweet_data
        │    ├─ fxtwitter (بدون کوکی): متن کامل، آمار، رسانه age-restricted، link_map
        │    └─ syndication (با کوکی): رسانه، فیلدهای پایه
        │    └─ merge: طول متن، آمار fxtwitter، رسانه fxtwitter اگر بود
        ├─ _collect_tweet_media (۴ ساختار) → mp4 از variants → dedupe با media_id
        │
        ├─ media_items خالی + بدون hint؟ → فقط کپشن (text)
        ├─ media_items خالی + hint / هیچ داده → yt-dlp (tempdir + cookiefile)
        │
        ├─ ۱ آیتم → send_video / send_photo
        ├─ بیش از ۱ → آلبوم ۸تایی مخلوط، بَچ‌به‌بَچ، کپشن روی اولین ارسالی
        ├─ همه رد شدند → yt-dlp
        │
        ├─ build_caption (۱۰۲۴ سقف، فوتر محفوظ)
        ├─ build_caption_overflow → پیام‌های اضافی (۴۰۹۶ سقف)
        ├─ add_download(..., status, type, "x")
        └─ پاک‌سازی tempdir در finally
```

---

## ۱۴. نکات عملیاتی

- **`yt-dlp`** برای X فقط در حالت fallback استفاده می‌شود (برخلاف تیک‌تاک که `gallery-dl` مسیر اصلی است).
- **`cookies.txt` بین X و اینستاگرام مشترک است** و هر دو لودر **ستون دامنه را نادیده می‌گیرند** (`load_cookies` در X از `parts[5]` و `parts[6]` می‌خواند؛ `_load_all_cookies_from_file` در اینستاگرام هم همین کار را می‌کند). نتیجه: هر کوکی در فایل، صرف‌نظر از دامنه‌اش، به هر دو سرویس فرستاده می‌شود. آپلود یک فایل کوکیِ تک‌دامنه، کوکی‌های دامنهٔ دیگر را از فایل حذف می‌کند — باید فایل ترکیبی آپلود شود.
- **یکی نیستی در خواندن `#HttpOnly_`**: لودر اینستاگرام پیشوند استاندارد `#HttpOnly_` را حذف می‌کند و خط را معتبر می‌شمارد، ولی `load_cookies` در X هر خطی که با `#` شروع شود را کامنت می‌داند و **دور می‌ریزد**. کوکی‌هایی که `yt-dlp` با این پیشوند ذخیره می‌کند (مثل `auth_token` در برخی خروجی‌ها) در مسیر X نادیده گرفته می‌شوند.
- **بدون کوکی** هم مسیر fxtwitter کار می‌کند، اما پست‌هایی که Syndication برایشان tombstone می‌دهد (age-restricted) ممکن است به `yt-dlp` برسند و آنجا بدون کوکی شکست بخورند.
- فایل `cookies.txt` فعلی پروژه فقط کوکی‌های `.instagram.com` را دارد؛ یعنی اجرای فعلی X عملاً بدون کوکی کار می‌کند و به مسیر fxtwitter + Syndication عمومی متکی است.
- **پست‌های حساس** (`possibly_sensitive`) به‌عنوان «نشانهٔ رسانه» در نظر گرفته می‌شوند تا مسیر yt-dlp فعال شود، نه این‌که فقط متن ارسال شود.
- **حافظه**: برخلاف تیک‌تاک که فایل روی دیسک می‌نویسد، X تمام رسانه را در RAM می‌گیرد؛ آلبوم ۸تایی و `clear()` بعد از هر بَچ برای همین است.
- **بدون محدودیت حجم صریح**: محدودیت واقعی سمت API تلگرام است؛ فایل‌های بزرگ‌تر از سقف آپلود، در مرحلهٔ `send_video`/`send_media_group` شکست می‌خورند.