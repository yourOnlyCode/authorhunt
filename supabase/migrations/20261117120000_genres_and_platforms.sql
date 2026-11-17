-- The genres and platforms authors pick from, as production starts. Until now
-- only the development seed filled these tables, so production had none and no
-- page could pass the "at least one genre" check. The lists are lib/catalog.ts;
-- tests/catalog.test.ts keeps the two the same. Safe to run twice: a row that is
-- already there is left alone, names included.

INSERT INTO "genres" ("slug", "name") VALUES
  ('fantasy', 'Fantasy'),
  ('science-fiction', 'Science fiction'),
  ('horror', 'Horror'),
  ('mystery', 'Mystery'),
  ('cozy-mystery', 'Cozy mystery'),
  ('thriller', 'Thriller'),
  ('romance', 'Romance'),
  ('historical-fiction', 'Historical fiction'),
  ('literary', 'Literary'),
  ('poetry', 'Poetry'),
  ('memoir', 'Memoir'),
  ('essays', 'Essays'),
  ('young-adult', 'Young adult'),
  ('childrens', 'Children''s'),
  ('nonfiction', 'Nonfiction'),
  ('short-stories', 'Short stories'),
  ('fan-fiction', 'Fan fiction')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "platforms" ("slug", "name", "hidden") VALUES
  ('amazon-kdp', 'Amazon KDP', false),
  ('ingramspark', 'IngramSpark', false),
  ('lulu', 'Lulu', false),
  ('draft2digital', 'Draft2Digital', false),
  ('kobo-writing-life', 'Kobo Writing Life', false),
  ('wattpad', 'Wattpad', false),
  ('royal-road', 'Royal Road', false),
  ('substack', 'Substack', false),
  ('archive-of-our-own', 'Archive of Our Own', false),
  ('fanfiction-net', 'FanFiction.Net', false),
  ('own-site', 'The author''s own site', false),
  ('traditional', 'A publisher', false),
  ('lorec', 'Lorec', true)
ON CONFLICT ("slug") DO NOTHING;
