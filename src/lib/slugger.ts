import slugify from 'slugify';
import stopwords from '@stdlib/datasets-stopwords-en';

const stopwordList = stopwords();

export const slugger = (str: string, lengthLimit = 50): string => {
  const words = str.toLowerCase().split(' ');
  const filteredWords = words.filter((v: string) => stopwordList.indexOf(v) < 0);
  let slugged = slugify(filteredWords.join(' '), { locale: 'en' });
  while (slugged.length > lengthLimit) {
    slugged = slugged.slice(0, slugged.lastIndexOf('-'));
  }
  return slugged;
};
