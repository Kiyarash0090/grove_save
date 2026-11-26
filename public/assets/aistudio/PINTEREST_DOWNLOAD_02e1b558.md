# متد دانلود از Pinterest — پردازش لینک و فرآیند دانلود

این سند فقط مسیر فنی دانلود از Pinterest را توضیح می‌دهد: لینک چطور شناسایی و نرمال می‌شود، pin_id و هش تصویر از کجا می‌آید، چطور بین ویدیو/GIF/کاروسل/تک‌عکس تصمیم گرفته می‌شود و فایل‌ها در چه کیفیتی گرفته می‌شوند.

کد مرتبط:
- [main.py](main.py) — تشخیص لینک، بررسی دسترسی، مسیریابی و کنترل هم‌زمانی
- [pinterest_downloader.py](pinterest_downloader.py) — واکشی صفحه، استخراج هش‌ها/ویدیو، دانلود، کپشن و پاک‌سازی

---

## ۱. شناسایی لینک

دو الگوی متفاوت در کار است و این تفاوت مهم است.

### الف) الگوی دروازه (gate) — در [main.py:64](main.py:64)

```python
PINTEREST_LINK_PATTERN = r"https?://(?:www\.)?pinterest\.com/\S+|https?://pin\.it/\S+"
```

این الگو **هر** مسیری روی `pinterest.com` را می‌گیرد: پین، برد، پروفایل، `idea`، همه. با همین الگو هندلر صدا زده می‌شود ([main.py:3072](main.py:3072) و [main.py:5943](main.py:5943)).

### ب) الگوی استخراج (extract) — در [main.py:3893](main.py:3893)

```python
m = re.search(r"(https?://(?:www\.)?pinterest\.com/pin/\d+|https?://pin\.it/\S+)", message.text)
```

این یکی **فقط** پین واقعی (`/pin/<عدد>`) یا لینک کوتاه `pin.it` را می‌پذیرد.

### نتیجهٔ عملی این تفاوت

اگر کاربر لینکی مثل `https://www.pinterest.com/someuser/someboard/` بفرستد:

1. الگوی دروازه می‌گیرد → هندلر اجرا می‌شود.
2. بررسی مسدود بودن و عضویت اجباری انجام می‌شود.
3. ری‌اکشن و پیام `⏳` ارسال می‌شوند.
4. الگوی استخراج **هیچ چیزی پیدا نمی‌کند** → فقط یک خط `logger.error` ثبت و `return` می‌شود.

یعنی کاربر پیام `⏳` می‌بیند که هیچ‌وقت حذف نمی‌شود و هیچ پاسخ یا خطایی هم دریافت نمی‌کند. این رفتار عمدی نیست — نتیجهٔ ناهماهنگی دو الگوست.

### پاک‌سازی لینک

پس از استخراج، علائم پایانی حذف می‌شوند:

```python
pinterest_url = m.group(1).rstrip('.,!?)]\'"')
```

سپس یک بررسی سخت‌گیرانه‌تر با `startswith` انجام می‌شود ([main.py:3937](main.py:3937)):

```python
if not pinterest_url.startswith(("https://pinterest.com/", "https://www.pinterest.com/",
                                 "https://pin.it/", "http://pin.it/")):
    raise ValueError("لینک Pinterest نامعتبر است!")
```

این بررسی عملاً فقط برای رد کردن `http://pinterest.com/...` (بدون `s` و بدون `www`) و `http://www.pinterest.com/...` است، چون الگوی regex این‌ها را می‌پذیرد ولی `startswith` رد می‌کند. لینک‌های `http://` روی `pinterest.com` با پیام «لینک نامعتبر» برگردانده می‌شوند.

---

## ۲. نرمال‌سازی لینک

`resolve_pin_url` ([pinterest_downloader.py:31](pinterest_downloader.py:31)) لینک کوتاه `pin.it` را با دنبال‌کردن ریدایرکت‌ها باز می‌کند:

```python
resp = session.get(url, timeout=15, allow_redirects=True)
```

سپس `pin_id` را از دو جا جست‌وجو می‌کند:

1. **آدرس نهایی** (`resp.url`) با `re.search(r"/pin/(\d+)/", final)`
2. **تاریخچهٔ ریدایرکت‌ها** (`resp.history`) — چون Pinterest گاهی مسیرهایی مثل `/pin/123/sent/` را در میانهٔ زنجیره رد می‌کند که در آدرس نهایی دیده نمی‌شوند.

خروجی همیشه یک آدرس تمیز و یکسان است:

```python
f"https://www.pinterest.com/pin/{pin_id}/"
```

اگر هیچ `pin_id` پیدا نشود یا درخواست خطا بدهد، `None` برمی‌گردد — و این مسیر، در `download_pinterest` به fallback مستقیم `yt-dlp` منتهی می‌شود (بخش ۷).

> نکتهٔ ریز: regex نیاز به اسلش پایانی دارد. آدرسی مثل `/pin/123` بدون اسلش گرفته نمی‌شود، هرچند Pinterest معمولاً با اسلش ریدایرکت می‌کند.

---

## ۳. واکشی صفحه و شناسایی نوع پین

پس از resolve، یک‌بار صفحه با `session.get` گرفته می‌شود و **همان یک HTML** بین همهٔ مراحل بعدی به اشتراک گذاشته می‌شود (بدون درخواست تکراری):

```python
resp = session.get(resolved, timeout=15, allow_redirects=True)
html = resp.text
final_url = resp.url
pin_id = _extract_pin_id(html, final_url)
```

`_extract_pin_id` اول `"pin_id": 123` را در HTML می‌گردد و اگر نبود، از آدرس. اگر `pin_id` نباشد، کل چیزی که کشف شده باشه دور ریخته می‌شود و بقیهٔ مسیر با `pin_id = None` ادامه می‌یابد.

### ترتیب تشخیص نوع — مهم است

کد **به ترتیب** این چهار حالت را بررسی می‌کند و اولین موفق برنده است:

| ترتیب | نوع | تابع تشخیص |
|---|---|---|
| ۱ | ویدیو | `_extract_video_url` |
| ۲ | GIF | `_extract_gif_url` |
| ۳ | کاروسل | `_extract_carousel_hashes` |
| ۴ | تک‌عکس | `_extract_og_image` → `_fallback_single_hash` |

این ترتیب یعنی **اگر یک pin هم ویدیو باشد و هم عکس داشته باشد، فقط ویدیو ارسال می‌شود** و عکس‌ها نادیده گرفته می‌شوند.

توجه: تابع `detect_pin_media` (خط ۱۱۶) که همین منطق را به‌صورت یکجا انجام می‌دهد و داکیومنت هم دارد، **هیچ‌جا صدا زده نمی‌شود** — کد مرده است. همین‌طور `_verify_url` و `_detect_media_type_from_url`. مسیر واقعی، همان ترتیب بالا در بدنهٔ `download_pinterest` است.

---

## ۴. استخراج هش تصویر

Pinterest تصاویر را با نام فایل هش ۳۲ کاراکتری هگز ذخیره می‌کند و آدرس از روی آن ساخته می‌شود. به همین دلیل کل کار استخراج تصویر = پیدا کردن هش‌ها.

### ساخت آدرس از هش

```python
def _build_pinimg_url(hash32, size):
    return f"https://i.pinimg.com/{size}/{hash32[:2]}/{hash32[2:4]}/{hash32[4:6]}/{hash32}.jpg"
```

پوشه‌های مسیر از سه جفت کاراکتر اول هش ساخته می‌شوند — الگوی ثابت CDN پینترست.

### کاروسل

منبع اصلی `carouselData.carouselSlots` است:

```python
seg = re.search(r'"carouselData":\s*\{', html)
chunk = html[seg.start() : seg.start() + 200_000]
hashes = sorted(set(re.findall(r'"imageSignature":"([a-f0-9]{32})"', chunk)))
```

- جست‌وجو فقط در ۲۰۰ هزار کاراکتر بعد از شروع `carouselData` انجام می‌شود تا هش‌های نامرتبط صفحه (آواتار، پین‌های پیشنهادی) وارد نشوند.
- `CSS_ASSET_HASH = "d53b014d86a6b6761bf649a0ed813c2b"` یک آیکون ثابت CSS است که در همهٔ صفحات می‌آید و همیشه فیلتر می‌شود.

**ایراد واقعی:** `sorted(set(...))` ترتیب اصلی اسلایدها را از بین می‌برد. هش‌ها به ترتیب الفبایی مرتب می‌شوند، پس ترتیب ارسال اسلایدها با ترتیب واقعی کاروسل یکی نیست — ترتیب تصادفی اما ثابت است. برای نمایش درست باید `sorted` حذف و فقط `set` برای حذف تکراری‌ها استفاده شود (با حفظ ترتیب اول ظهور).

### تک‌عکس

سه لایه، به ترتیب:

1. **`og:image`** — متا تگ استاندارد، با regex که هش را از انتهای آدرس می‌کشد.
2. **`id="pin-image-preload"`** — تگ preload که Pinterest برای تصویر اصلی می‌گذارد.
3. **`_fallback_single_hash`** — پرتکرارترین هش `i.pinimg.com` در کل صفحه (با `Counter`)، به‌جز هش CSS.

لایهٔ سوم خطرناک است: اگر صفحه ساختار عادی نداشته باشد، ممکن است آواتار سازنده یا تصویر یک پین پیشنهادی به‌جای تصویر اصلی انتخاب شود. چون فقط در نبود دو لایهٔ اول اجرا می‌شود، ریسکش محدود است.

---

## ۵. استخراج ویدیو

`_extract_video_url` ([pinterest_downloader.py:170](pinterest_downloader.py:170)) شش لایه دارد و اولین موفق برنده است:

| # | الگو | پوشش |
|---|---|---|
| ۱ | `content="..." property="og:video"` | متا تگ استاندارد (ترتیب صفت ثابت) |
| ۲ | `property="og:video" content="..."` | همان، ترتیب صفت برعکس |
| ۳ | `v\d*\.pinimg\.com/*.mp4` | سرورهای ویدیوی شماره‌دار (v1، v2، ...) |
| ۴ | `videos\.pinimg\.com/*.mp4` | سرور ویدیوی جدید |
| ۵ | `/expMp4/...mp4` | ویدیوهای StoryPin / IdeaPin |
| ۶ | هر URL ending به `.mp4`/`.webm` که شامل `pinimg` یا `pinterest` باشد | آخرین تلاش |
| ۷ | هر `.m3u8` | استریم HLS — به `yt-dlp` سپرده می‌شود |

در همهٔ حالات `\\/` (اسلش escape‌شده در JSON داخل HTML) به `/` تبدیل می‌شود.

**ریسک لایهٔ ۶:** جست‌وجوی «هر mp4 در صفحه» می‌تواند ویدیوی تبلیغاتی یا پین پیشنهادی را بگیرد. چون شرط «شامل pinimg یا pinterest» فقط دامنه را چک می‌کند نه این‌که ویدیو متعلق به همین پین است، در صفحات شلوغ ممکن است محتوای اشتباه دانلود شود.

### GIF

`_extract_gif_url` دو منبع دارد: `i.pinimg.com/...gif` و `media.giphy.com` / `media.tenor.com`. این مسیر فقط وقتی اجرا می‌شود که هیچ ویدیویی پیدا نشده باشد.

> نکته: GIF با همان `download_video_pin` دانلود می‌شود که فایل را `{pin_id}_video.mp4` نام‌گذاری می‌کند. یعنی یک فایل GIF با پسوند `.mp4` ذخیره و با `send_animation` فرستاده می‌شود. Pyrogram معمولاً محتوا را از روی بایت‌ها تشخیص می‌دهد، ولی این نام‌گذاری گمراه‌کننده است و اگر روزی اعتبارسنجی بر اساس پسوند اضافه شود، می‌شکند.

---

## ۶. دانلود تصاویر — زنجیرهٔ کیفیت

`download_slides` ([pinterest_downloader.py:247](pinterest_downloader.py:247)) برای هر هش، سه کیفیت را **به ترتیب** امتحان می‌کند:

```python
QUALITY_LEVELS = ("originals", "1200x", "736x")
```

```python
for quality in QUALITY_LEVELS:
    url = _build_pinimg_url(h, quality)
    r = session.get(url, timeout=30, allow_redirects=True)
    if r.status_code == 200 and len(r.content) > 2000:
        # ذخیره و break
```

منطق:

1. **`originals`** — کیفیت اصلی، بدون تغییر اندازه. اگر پین اصلی داشته باشد برنده است.
2. **`1200x`** — اگر `originals` نبود (که برای پین‌های قدیمی یا آپلودهای محدود رایج است).
3. **`736x`** — آخرین لایه، تقریباً همیشه موجود است.

شرط `len(r.content) > 2000` جلوی ذخیرهٔ پاسخ‌های کوچک (خطا، تصویر جایگزین ۱×۱) را می‌گیرد. اگر هر سه کیفیت شکست بخورند، آن اسلاید **بی‌صدا حذف** می‌شود — بدون پیام خطا. اگر همهٔ اسلایدها حذف شوند، `saved` خالی است و مسیر خطا فعال می‌شود.

نام فایل: `{pin_id}_{شمارهٔ اسلاید}.jpg` در پوشهٔ `str(user_id)`.

> نکته: `_build_pinimg_url` همیشه آدرس `.jpg` می‌سازد، پس خط `ext = ".png" if ".png" in url.lower() else ".jpg"` هیچ‌وقت `.png` انتخاب نمی‌کند. پین‌های PNG با پسوند `.jpg` ذخیره می‌شوند (محتوای واقعی همان است که سرور برگردانده).

Pinterest فرمت WebP هم می‌دهد؛ کد آن را در نظر نمی‌گیرد و فقط `.jpg` می‌خواهد، پس همیشه نسخهٔ JPEG را می‌گیرد.

---

## ۷. دانلود ویدیو — دو مسیر

`download_video_pin` ([pinterest_downloader.py:287](pinterest_downloader.py:287)) دو حالت دارد:

### الف) استریم HLS (`*.m3u8`)

مستقیم به خط فرمان `yt-dlp` سپرده می‌شود:

```python
cmd = ["yt-dlp", "-f", "bestvideo+bestaudio/best", "-o", output_template,
       "--quiet", "--no-warnings", "--no-check-certificate", "--retries", "3", video_url]
subprocess.run(cmd, capture_output=True, timeout=120)
```

- در یک `tempfile.mkdtemp(prefix="pinterest_hls_")` جدا کار می‌کند.
- تایم‌اوت ۱۲۰ ثانیه.
- فایل نهایی (هر کدام از `.mp4/.mkv/.webm/.ts`) به `{pin_id}_video.mp4` تغییر نام می‌دهد — حتی اگر محتوای واقعی MKV یا TS باشد.
- پوشهٔ موقت در هر دو حالت موفق و ناموفق پاک می‌شود.

### ب) MP4/WebM مستقیم

```python
r = session.get(video_url, timeout=60, allow_redirects=True)
if r.status_code == 200 and len(r.content) > 10_000:
```

- حد ۱۰ کیلوبایت برای رد کردن پاسخ‌های خطا.
- تایم‌اوت ۶۰ ثانیه.

### fallback سراسری: `_download_video_ytdlp`

اگر `download_video_pin` شکست بخورد، `_download_video_ytdlp(resolved, pin_id)` صدا زده می‌شود که با **API پایتونی** `yt_dlp` روی آدرس خود پین کار می‌کند:

```python
format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
outtmpl: <tmpdir>/<pin_id>.%(ext)s
nocheckcertificate: True
retries: 3
```

- در `run_in_executor` اجرا می‌شود تا حلقهٔ asyncio قفل نشود (برخلاف مسیر HLS که `subprocess` است و با `asyncio.to_thread` جابه‌جا می‌شود).
- اگر پسوند نهایی `.mp4` نبود، فایل به `.mp4` تغییر نام می‌دهد.
- پوشهٔ موقت با فراخواننده (`_cleanup`) پاک می‌شود، نه داخل تابع.

نکته: `yt-dlp` در اینجا هم به‌صورت CLI و هم به‌صورت کتابخانه استفاده می‌شود — دو مسیر متفاوت برای یک کار.

---

## ۸. کپشن

`_build_caption` ([pinterest_downloader.py:663](pinterest_downloader.py:663)) ترتیب ثابتی دارد:

1. **بلوک «Downloaded by»** — نام فرستنده به‌صورت منشن کلیک‌پذیر (`tg://user?id=`)، داخل بلوک نقل‌قول.
2. **Creator** — از `"username":"..."` در HTML، با `@` و پررنگ.
3. **📌 Title** — از `og:title`، به‌جز وقتی که مقدار `"Pinterest"` یا خالی باشد.
4. **📝 Description** — از `og:description`، به‌جز `"Explore the best of Pinterest."` (متن عمومی)، و **به ۲۰۰ کاراکتر بریده می‌شود**.
5. **Post Link** — لینکی که کاربر فرستاده (نه آدرس resolve‌شده).
6. **خط جداکننده + برندینگ**.

محدودیت ۲۰۰ کاراکتری برای description سخت‌کدشده است و مثل بقیهٔ دانلودرها بر اساس فضای باقی‌ماندهٔ ۱۰۲۴ کاراکتر محاسبه نمی‌شود. اگر description طولانی نباشد مشکلی نیست، ولی اگر بقیهٔ بخش‌ها (نام کاربر، عنوان) طولانی باشند، سقف کل کپشن ممکن است رد شود و ارسال خطا بدهد.

در مسیر `yt-dlp` مستقیم (وقتی resolve شکست خورد)، کپشن با `html=""` ساخته می‌شود، یعنی **بدون Creator/Title/Description** و فقط با نام، لینک و برندینگ.

---

## ۹. ارسال

### تک‌فایل

- `.mp4` → `send_video`
- غیر `.mp4` → `send_photo`

### آلبوم

- دسته‌های **۱۰تایی** (سقف تلگرام) با `InputMediaPhoto`.
- کپشن روی **آیتم اول هر دسته** — نه فقط دستهٔ اول. برای کاروسل بیش از ۱۰ اسلاید، کپشن در هر آلبوم تکرار می‌شود.
- بین دسته‌ها ۱ ثانیه تأخیر.

### نوع رسانه در دیتابیس

```python
media_type = "carousel" if len(saved) > 1 else "image"
```

برای کل پین **یک** رکورد ثبت می‌شود (برخلاف X و تیک‌تاک که برای هر آیتم جدا ثبت می‌کنند). مقادیر ثبت‌شده با پلتفرم `"pinterest"`:

| وضعیت | file_type |
|---|---|
| `success` | `video` / `gif` / `carousel` / `image` |
| `failed` | `None` |

### خطای «topics»

در `send_media_group` خطای شامل کلمهٔ `"topics"` سرکوب می‌شود و به‌عنوان موفقیت تلقی می‌گردد — همان الگوی تیک‌تاک. این خطای شناخته‌شدهٔ Pyrogram در تاپیک‌های فروم است و رسانه در واقع ارسال شده.

---

## ۱۰. خطاها و پاک‌سازی

### مسیرهای بازگشت `False`

| موقعیت | پیام |
|---|---|
| resolve شکست خورد و `yt-dlp` هم چیزی نداد | پیام خطای عمومی |
| نه هش تصویری نه ویدیو نه GIF پیدا شد | پیام خطای عمومی |
| `saved` خالی بود (همهٔ اسلایدها رد شدند) | پیام خطای عمومی |
| ارسال به تلگرام استثنا داد | پیام خطای عمومی |
| خطای غیرمنتظره در کل تابع | `logger.exception` + پیام خطای عمومی |

در همهٔ حالات بالا `add_download(..., "failed", None)` ثبت می‌شود.

### پاک‌سازی

- **فایل‌ها**: در `finally` بلوک ارسال، هر `item["path"]` با `os.remove` پاک می‌شود. فایل ویدیو و GIF با `_cleanup(sticker_message, filepath, tmp_dir)` پاک می‌شوند.
- **پوشهٔ موقت `yt-dlp`**: با `_cleanup` و `shutil.rmtree`.
- **پیام `⏳`**: با `_cleanup`.

### ایراد: پوشهٔ کاربر هیچ‌وقت حذف نمی‌شود

```python
output_dir = str(user_id)
os.makedirs(output_dir, exist_ok=True)
```

این پوشه در هیچ مسیری `rmtree` نمی‌شود (برخلاف تیک‌تاک که در `finally` کل پوشه را پاک می‌کند). فقط فایل‌های داخلش پاک می‌شوند. نتیجه: به ازای هر کاربری که حداقل یک‌بار پینتریست دانلود کند، یک **پوشهٔ خالی** روی دیسک می‌ماند. در محیط‌هایی مثل Railway که دیسک موقتی است مشکل جدی نیست، ولی در اجرای بلندمدت تعداد پوشه‌ها بی‌نهایت رشد می‌کند.

### ایراد: `return True` حتی وقتی ارسال شکست خورده

در بلوک `finally` بعد از ارسال، خط `return True` بیرون از `try/except` است:

```python
except Exception as e:
    ...
    add_download(user_id, url, "failed", None)
finally:
    await _cleanup(...)
return True          # ← همیشه True
```

اگر ارسال رسانه شکست بخورد، در دیتابیس `failed` ثبت می‌شود ولی تابع `True` برمی‌گرداند. چون `handle_pinterest_download` بر اساس مقدار بازگشتی تصمیم می‌گیرد، **پیام لینک کاربر حذف می‌شود** به‌رغم شکست. (در تیک‌تاک و X این مسیر `False` برمی‌گرداند و لینک باقی می‌ماند.)

---

## ۱۱. احراز هویت و شبکه

- **هیچ کوکی‌ای استفاده نمی‌شود.** `_make_session` فقط `User-Agent` می‌گذارد ([pinterest_downloader.py:24](pinterest_downloader.py:24)). برخلاف X، فایل `cookies.txt` در این ماژول خوانده نمی‌شود.
- نتیجه: پین‌های خصوصی، بردهای محافظت‌شده و محتوای نیازمند ورود قابل دانلود نیستند.
- همهٔ درخواست‌ها با `requests` (همگام) هستند و با `asyncio.to_thread` جابه‌جا می‌شوند تا حلقهٔ asyncio قفل نشود:

  | فراخوانی | اجرا |
  |---|---|
  | `resolve_pin_url`, `session.get(html)` | مستقیم در حلقهٔ async ← **مسدودکننده** |
  | `download_video_pin` | `asyncio.to_thread` |
  | `download_slides` | `asyncio.to_thread` |
  | `_download_video_ytdlp` | `run_in_executor` |

  دو مورد اول در بدنهٔ `download_pinterest` **بدون** `to_thread` صدا زده می‌شوند، یعنی هر بار تا ۱۵ ثانیه کل حلقهٔ asyncio ربات بلاک می‌شود. با سقف ۱۰ دانلود هم‌زمان، این می‌تواند پاسخ‌گویی بقیهٔ ربات را کند کند.
- تایم‌اوت‌ها: resolve و صفحه ۱۵ ثانیه، تصویر ۳۰ ثانیه، ویدیو ۶۰ ثانیه، HLS ۱۲۰ ثانیه.

---

## ۱۲. کنترل هم‌زمانی

مثل بقیهٔ پلتفرم‌ها، در `handle_pinterest_download` کل مسیر زیر `DOWNLOAD_SEMAPHORE` با ظرفیت ۱۰ اجرا می‌شود ([main.py:102](main.py:102)). این semaphore **مشترک** است بین تیک‌تاک، X، پینترست و اینستاگرام — یعنی حداکثر ۱۰ درخواست در کل ربات، نه ۱۰ در هر پلتفرم.

---

## ۱۳. خلاصهٔ جریان کامل

```
پیام حاوی لینک
   │
   ├─ الگوی دروازه: هر مسیری روی pinterest.com یا pin.it
   ├─ بررسی مسدود بودن + عضویت اجباری
   ├─ ری‌اکشن + پیام ⏳
   ├─ semaphore(10)
   │
   ├─ الگوی استخراج: فقط /pin/<عدد> یا pin.it  ── نه؟ → لاگ و return (بی‌پاسخ)
   ├─ startswith سخت‌گیرانه (http://pinterest.com رد می‌شود)
   │
   └─ download_pinterest
        ├─ resolve_pin_url → GET + redirects → https://www.pinterest.com/pin/<id>/
        │     └─ شکست → yt-dlp مستقیم روی لینک اصلی → ارسال ویدیو/داکیومنت
        ├─ GET صفحه → یک HTML مشترک
        ├─ pin_id از HTML یا آدرس
        │
        ├─ ۱) ویدیو؟  _extract_video_url (۶ لایه + m3u8)
        │       ├─ m3u8 → yt-dlp CLI (subprocess، tmpdir جدا)
        │       └─ mp4  → GET مستقیم (>10KB)
        │       └─ شکست → _download_video_ytdlp (API پایتونی)
        │       └─ موفق → send_video، در صورت خطا send_document
        │
        ├─ ۲) GIF؟  gif_url → download_video_pin → send_animation
        │
        ├─ ۳) کاروسل؟  carouselData.carouselSlots → imageSignature[]
        │       └─ sorted(set(...))  ← ترتیب اسلایدها از بین می‌رود
        ├─ ۴) تک‌عکس؟  og:image → pin-image-preload → پرتکرارترین هش
        │
        ├─ download_slides: originals → 1200x → 736x (شرط >2KB)
        │     └─ شکست هر سه → اسلاید بی‌صدا حذف
        ├─ ۱ فایل → send_video/send_photo
        ├─ چند فایل → آلبوم ۱۰تایی، کپشن روی اول هر دسته
        ├─ add_download(..., status, "<video|gif|carousel|image>", "pinterest")
        └─ finally: حذف فایل‌ها + tmpdir + پیام ⏳  (پوشهٔ کاربر باقی می‌ماند)
```

---

## ۱۴. نکات عملیاتی

- **بدون کوکی** — تنها پلتفرم بدون احراز هویت در این پروژه.
- **`yt-dlp` دو نقش دارد**: استریم HLS را با CLI می‌گیرد، و fallback کل پین را با API پایتونی. `gallery-dl` در این مسیر استفاده نمی‌شود.
- **کیفیت تصویر به ترتیب `originals > 1200x > 736x`** است و اولین موفق برنده — نه بزرگ‌ترین فایل موجود.
- **Pinterest فرمت WebP می‌دهد** ولی کد فقط `.jpg` می‌خواهد؛ همیشه نسخهٔ JPEG گرفته می‌شود.
- **کد مرده**: `detect_pin_media`, `_verify_url`, `_detect_media_type_from_url` هیچ‌جا صدا زده نمی‌شوند و منطقشان در بدنهٔ `download_pinterest` تکرار شده است. اگر تغییر بدهید، این‌ها اثر ندارند.
- **پین‌های ویدیویی که عکس هم دارند** فقط ویدیو می‌فرستند، چون بررسی ویدیو اول است و به عکس نمی‌رسد.
- **ترتیب اسلایدهای کاروسل درست نیست** (به‌خاطر `sorted`). اگر ترتیب اهمیت دارد، اصلاح لازم است.