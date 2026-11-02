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

    def test_no_production_configuration(self):
        html = (ROOT/'index.html').read_text()
        self.assertNotIn('firebaseConfig',html)
        self.assertNotIn('stripe.com',html)

if __name__ == '__main__': unittest.main()
