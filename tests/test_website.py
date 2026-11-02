import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class WebsiteTests(unittest.TestCase):
    def test_required_files(self):
        for name in ('index.html','style.css','script.js','BSG GOLD LOGO.png','BSG BLACK GOLD.png'):
            self.assertTrue((ROOT/name).is_file(), name)

    def test_preparedness_navigation(self):
        html = (ROOT/'index.html').read_text()
        for section in ('mission','divisions','equipment','training','comms','contact'):
            self.assertIn(f'id="{section}"',html)
        self.assertIn('PREPAREDNESS',html)
        self.assertIn('BSG COMMS',html)
        self.assertIn('lang="en-GB"',html)
        self.assertIn('aria-expanded="false"',html)

    def test_featured_media(self):
        html = (ROOT/'index.html').read_text()
        css = (ROOT/'style.css').read_text()
        self.assertTrue((ROOT/'hero1.jpg').is_file())
        self.assertTrue((ROOT/'hero2.jpg').is_file())
        self.assertIn('url("./hero1.jpg")', css)
        self.assertIn('url("./hero2.jpg")', css)
        self.assertIn('www.youtube-nocookie.com/embed/hWWejOy1vys?start=32', html)
        self.assertIn('loading="lazy"', html)
        self.assertIn('title="Black Survival Gear featured YouTube video"', html)

    def test_integrated_comms(self):
        html = (ROOT/'index.html').read_text()
        comms = (ROOT/'comms'/'index.html').read_text()
        self.assertIn('href="./comms/"', html)
        self.assertNotIn('href="https://imotechai.github.io/squawk/"', html)
        self.assertIn('BSG COMMS', comms)
        self.assertIn('href="../"', comms)
        self.assertIn('disabled title="Requires verified model-specific read protocol"', comms)
        self.assertIn('disabled title="Requires verified model-specific write protocol"', comms)

    def test_comms_logo_uses_existing_asset(self):
        html = (ROOT/'comms'/'index.html').read_text()
        css = (ROOT/'comms'/'style.css').read_text()
        self.assertTrue((ROOT/'BSG GOLD LOGO.png').is_file())
        self.assertIn('src="../BSG%20GOLD%20LOGO.png"', html)
        self.assertNotIn('Tactical%20BSG COMMS%20Radio%20Emblem.png', html)
        self.assertIn('header img{width:74px;height:74px;object-fit:contain;flex-shrink:0}', css)

    def test_no_production_configuration(self):
        html = (ROOT/'index.html').read_text()
        self.assertNotIn('firebaseConfig',html)
        self.assertNotIn('stripe.com',html)

if __name__ == '__main__': unittest.main()
