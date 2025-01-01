import { getRecordMap, mapImageUrl } from '@/libs/notion';
import { Post } from '@/types/post';
import { getBlurImage } from '@/utils/get-blur-image';

export async function getAllPostsFromNotion() {
  const allPosts: Post[] = [];
  const recordMap = await getRecordMap(process.env.NOTION_DATABASE_ID!);
  const { block, collection } = recordMap;
  const schema = Object.values(collection)[0].value.schema;
  const propertyMap: Record<string, string> = {};

  Object.keys(schema).forEach((key) => {
    propertyMap[schema[key].name] = key;
  });

  Object.keys(block).forEach((pageId) => {
    if (
      block[pageId].value.type === 'page' &&
      (block[pageId].value.properties as any)?.[propertyMap['Slug']]
    ) {
      const { properties, last_edited_time } = block[pageId].value;

      const contents = block[pageId].value.content || [];
      const dates = contents.map((content) => {
        return block[content]?.value?.last_edited_time;
      });
      dates.push(last_edited_time);
      dates.sort((a, b) => b - a);
      const lastEditedAt = dates[0];

      const id = pageId;
      if (!properties) return;

      const slug = (properties as any)[propertyMap['Slug']][0][0];
      const title = (properties as any)[propertyMap['Page']][0][0];
      const categories = (properties as any)[
        propertyMap['Category']
      ][0][0].split(',');
      const cover = (properties as any)[propertyMap['Cover']][0][1][0][1];
      const date = (properties as any)[propertyMap['Date']][0][1][0][1][
        'start_date'
      ];
      const published =
        (properties as any)[propertyMap['Published']][0][0] === 'Yes';

      allPosts.push({
        id,
        title,
        slug,
        categories,
        // Fix 403 error for images.
        // https://github.com/NotionX/react-notion-x/issues/211
        cover: mapImageUrl(cover, block[pageId].value) || '',
        date,
        published,
        lastEditedAt,
      });
    }
  });

  const blurImagesPromises = allPosts.map((post) => getBlurImage(post.cover));
  const blurImages = await Promise.all(blurImagesPromises);
  allPosts.forEach((post, i) => (post.blurUrl = blurImages[i].base64));

  return allPosts;
}
