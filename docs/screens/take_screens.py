"""Takes the Chapter Four screenshots from the running app.

Run the API (which serves the built frontend) first, ideally on a fresh database so the
history page shows only the three predictions made here, for example:

    CLASSPREDICT_DB=sqlite:///screens.db uvicorn app.main:app --port 8000

then:  python take_screens.py            (set CLASSPREDICT_URL to use another address)

Needs:  pip install playwright   and Google Chrome installed (or `playwright install chromium`).
"""
import os
from playwright.sync_api import sync_playwright

BASE = os.getenv("CLASSPREDICT_URL", "http://localhost:8000")
OUT = os.path.dirname(os.path.abspath(__file__))
COHORT = os.path.join(OUT, "..", "..", "backend", "sample_data", "demo_cohort_csc.csv")
SETTLE = 3200  # ms for entrance animations (rings, gauge, charts, count-ups) to finish


def shot(page, name, full=False, settle=SETTLE):
    page.mouse.move(2, 2)              # keep the cursor spotlight off the cards
    page.wait_for_timeout(settle)
    page.screenshot(path=os.path.join(OUT, name), full_page=full)
    print("saved", name)


def login(page, email):
    page.goto(BASE + "/")
    page.wait_for_selector(".login__form")
    page.fill("input[type=email]", email)
    page.fill("input[type=password]", "demo1234")
    page.click(".login__form button[type=submit]")
    page.wait_for_selector(".topbar")


def logout(page):
    page.click(".avatar")
    page.click("text=Log out")
    page.wait_for_selector(".login__form")


def fill_predict(page, data, de=False):
    page.goto(BASE + "/predict")
    page.wait_for_selector(".predict-form")
    page.wait_for_timeout(900)          # let the saved profile load before typing
    if page.locator(".select__btn").inner_text().strip() != "Science":
        page.click(".select__btn")
        page.click(".select__opt >> text='Science'")
    page.click("text=Direct entry" if de else ".seg button:has-text('UTME')")
    page.get_by_label("Matric no.").fill(str(data.get("matric", "")))
    if not de:
        page.get_by_label("UTME", exact=True).fill(str(data["utme"]))
    page.get_by_label("O’Level points", exact=True).fill(str(data["olevel"]))
    page.get_by_label("Carry-overs", exact=True).fill(str(data["carry"]))
    cells = [f"{lvl} Level semester {s} GPA" for lvl in (100, 200, 300) for s in (1, 2)]
    for i, (label, v) in enumerate(zip(cells, data["gpas"])):
        if de and i < 2:
            continue
        page.get_by_label(label).fill("" if v is None else str(v))


def predict(page):
    page.click(".predict-form button[type=submit]")
    page.wait_for_selector(".hero__class")


def scroll_to(page, selector, offset=96):
    page.evaluate(
        "([s, o]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o); }",
        [selector, offset],
    )


def launch(p):
    try:
        return p.chromium.launch(channel="chrome")
    except Exception:  # Chrome not installed: fall back to Playwright's own Chromium
        return p.chromium.launch()


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
    page = ctx.new_page()

    # 1. login page
    page.goto(BASE + "/")
    page.wait_for_selector(".login__form")
    shot(page, "s01_login.png")

    # 2. registration form with the adviser role selected
    page.click(".login__form .seg button:has-text('Create account')")
    page.get_by_label("Full name").fill("Adewale Bisi")
    page.click(".login__form .seg button:has-text('Academic adviser')")
    page.get_by_label("Adviser access code").wait_for()
    shot(page, "s02_register.png", settle=1200)

    # student journey: stage 1, then stage 2, then stage 3
    login(page, "student@classpredict.demo")
    base = {"matric": "223456", "utme": 248, "olevel": 21, "carry": 1}
    fill_predict(page, {**base, "gpas": [2.95, 3.08, None, None, None, None]})
    predict(page)
    shot(page, "s03_predict_stage1.png", full=True)
    fill_predict(page, {**base, "gpas": [2.95, 3.08, 3.12, 2.98, None, None]})
    predict(page)
    fill_predict(page, {**base, "gpas": [2.95, 3.08, 3.12, 2.98, 3.21, 3.05]})
    predict(page)
    shot(page, "s04_predict_stage3.png", full=True)

    # validation message: no GPAs
    fill_predict(page, {**base, "gpas": [None] * 6})
    page.click(".predict-form button[type=submit]")
    page.wait_for_selector(".alert")
    shot(page, "s05_predict_error.png", settle=1500)

    # calculator, with the formula tooltip open
    page.goto(BASE + "/calculator")
    page.wait_for_selector(".slider")
    for label, value in (("Current CGPA value", "3.07"), ("Units completed value", "126"), ("Units remaining value", "42")):
        page.get_by_label(label).fill(value)
        page.keyboard.press("Tab")
    page.wait_for_timeout(SETTLE)
    page.hover(".card .hint")
    page.wait_for_selector(".hint .tip")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "s06_calculator.png"))
    print("saved s06_calculator.png")

    # history
    page.goto(BASE + "/history")
    page.wait_for_selector(".tbl")
    shot(page, "s07_history.png")

    # model page
    page.goto(BASE + "/model")
    page.wait_for_selector(".legend-bar")
    shot(page, "s08_model.png", full=True)

    # adviser
    logout(page)
    login(page, "adviser@classpredict.demo")
    page.goto(BASE + "/cohort")
    page.wait_for_selector(".drop")
    page.set_input_files("input[type=file]", COHORT)
    page.click("button:has-text('Upload and predict')")
    page.wait_for_selector(".cohort-results")
    shot(page, "s09_cohort.png", full=True)
    page.click(".table-tools .seg button:has-text('High risk')")
    scroll_to(page, ".table-tools")
    page.evaluate("window.scrollBy(0, -40)")
    shot(page, "s10_cohort_highrisk.png", settle=1500)
    b.close()
