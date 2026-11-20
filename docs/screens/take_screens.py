"""Takes the Chapter Four screenshots from the running app (http://localhost:8000)."""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8000"
OUT = os.path.dirname(os.path.abspath(__file__))
COHORT = os.path.join(OUT, "..", "..", "backend", "sample_data", "demo_cohort_csc.csv")


def shot(page, name, full=False):
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, name), full_page=full)
    print("saved", name)


def login(page, email):
    page.goto(BASE + "/")
    page.fill("input[type=email]", email)
    page.fill("input[type=password]", "demo1234")
    page.click("button.btn.primary")
    page.wait_for_selector(".side")


def fill_predict(page, data, de=False):
    page.goto(BASE + "/predict")
    page.wait_for_selector("form.card")
    page.wait_for_timeout(900)          # let the saved profile load before typing
    page.select_option("select", "Science")
    if de:
        page.click("text=Direct Entry (from 200 Level)")
    labels = page.locator("form.card label")
    def set_label(text, val):
        page.locator("label", has_text=text).locator("input").fill(str(val))
    set_label("Matric no.", data.get("matric", ""))
    if not de:
        set_label("UTME score", data["utme"])
    set_label("O'Level points", data["olevel"])
    set_label("Carry-overs", data["carry"])
    grid = page.locator(".gpa-grid input")
    for i, v in enumerate(data["gpas"]):
        if de and i < 2:
            continue
        grid.nth(i).fill("" if v is None else str(v))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
    page = ctx.new_page()

    # 1. login page
    page.goto(BASE + "/")
    page.wait_for_selector(".login-card")
    shot(page, "s01_login.png")
    # 2. register as adviser form
    page.click("text=Create account")
    page.select_option("select", "adviser")
    page.fill("input[placeholder='e.g. Adebayo Chidinma']", "Adewale Bisi")
    shot(page, "s02_register.png")

    # student journey: stage 1, then stage 2, then stage 3
    login(page, "student@classpredict.demo")
    base = {"matric": "223456", "utme": 248, "olevel": 21, "carry": 1}
    fill_predict(page, {**base, "gpas": [2.95, 3.08, None, None, None, None]})
    page.click("button:has-text('Predict my class')"); page.wait_for_selector(".big-class")
    shot(page, "s03_predict_stage1.png")
    fill_predict(page, {**base, "gpas": [2.95, 3.08, 3.12, 2.98, None, None]})
    page.click("button:has-text('Predict my class')"); page.wait_for_selector(".big-class")
    fill_predict(page, {**base, "gpas": [2.95, 3.08, 3.12, 2.98, 3.21, 3.05]})
    page.click("button:has-text('Predict my class')"); page.wait_for_selector(".big-class")
    shot(page, "s04_predict_stage3.png", full=True)

    # validation message: no GPAs
    fill_predict(page, {**base, "gpas": [None] * 6})
    page.click("button:has-text('Predict my class')"); page.wait_for_selector(".error")
    shot(page, "s05_predict_error.png")

    # calculator
    page.goto(BASE + "/calculator")
    page.locator("label", has_text="Current CGPA").locator("input").fill("3.07")
    page.locator("label", has_text="Units completed").locator("input").fill("126")
    page.locator("label", has_text="Units remaining").locator("input").fill("42")
    page.click("text=Calculate"); page.wait_for_selector(".tbl")
    shot(page, "s06_calculator.png")

    # history
    page.goto(BASE + "/history"); page.wait_for_selector(".tbl")
    shot(page, "s07_history.png")

    # model page
    page.goto(BASE + "/model"); page.wait_for_selector(".stats")
    page.wait_for_timeout(800)
    shot(page, "s08_model.png", full=True)

    # adviser
    page.click("text=Log out")
    login(page, "adviser@classpredict.demo")
    page.goto(BASE + "/cohort")
    page.set_input_files("input[type=file]", COHORT)
    page.click("text=Upload and predict"); page.wait_for_selector(".stats")
    page.wait_for_timeout(800)
    shot(page, "s09_cohort.png", full=True)
    page.click(".seg.small button:has-text('High risk')")
    shot(page, "s10_cohort_highrisk.png")
    b.close()
