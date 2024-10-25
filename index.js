const dotenv = require("dotenv");
dotenv.config();

const OpenAI = require('openai');
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("API key is missing!");
    process.exit(1);
}

const openai = new OpenAI(apiKey);

const fs = require('fs');
const path = require('path');
const externalJsonBlogPostList = process.env.STATIC_BLOG_POST_STORAGE_PATH;
const blogPostFolderBasePath = process.env.BLOG_POST_FOLDER_BASE_PATH;
const webpageBlogPostBaseUrl = process.env.WEBPAGE_BLOG_POST_BASE_URL;

//
//
//

function shuffleArray(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}


//
//
//

// parse `<Heading title="..."`
const parseTitleFromString = (input) => {
    const titleRegex = /<Heading[^>]*title="([^"]*)"/;
    const match = input.match(titleRegex);
    return match ? match[1] : null;
};


function getFirstPTagContent(htmlString) {
  // Define the regex pattern to find the first <p> tag and capture its contents
  const regex = /<p[^>]*>(.*?)<\/p>/s;
  // Match the pattern against the HTML string
  const match = htmlString.match(regex);
  // If there's a match, return the captured group (content of the first <p> tag), else return null
  return match ? match[1].trim() : null;
}


//
//
//


async function createFolderAndFile(folderName, content) {
    const folderPath = `${blogPostFolderBasePath}/${folderName}`;
    const filePath = `${folderPath}/page.tsx`;

    try {
        await fs.promises.mkdir(folderPath, { recursive: true });
        await fs.promises.writeFile(filePath, content, 'utf8');
        // console.log(`File created at ${filePath} with content`);
    } catch (error) {
        console.error(`Error creating folder or file: ${error.message}`);
    }
}


//
//
//

// Function to read files from a directory and Title Case them for an LLM to read
async function getCurrentStaticBlogPostData() {
    // globals
    let blogPostData = [];
    let tenBlogPostFileNames = [];

    console.log(externalJsonBlogPostList)


    // get the static blog post data
    try {
        const data = await fs.promises.readFile(externalJsonBlogPostList, 'utf8');
        blogPostData = JSON.parse(data);
        console.log(`Found ${blogPostData.length} existing blog posts`);

        const shuffled1 = shuffleArray(blogPostData);
        const shuffled2 = shuffleArray(shuffled1);

        let tenBlogPostResults = [];
        for (let i = 0; i < 10; i++) {
            if (shuffled2[i]) {
                tenBlogPostResults.push(shuffled2[i]);
            }
        }

        tenBlogPostFileNames = [];
        for (let x = 0; x < 10; x++) {
            if (tenBlogPostResults[x] && tenBlogPostResults[x].file) {
                tenBlogPostFileNames.push(tenBlogPostResults[x].file);
            }
        }


        return {
            blogPostData,
            tenBlogPostFileNames,
            tenBlogPostResults,
            // exampleBlogPostFileContents,
        };
    } catch (error) {
        console.error(`Error getting blogPostData: ${error.message}`);
        return [];
    }
}

//
//
//
// blog post title

async function getBlogPostTitleCompletion(blogPostFileNamesList) {

  blogPostFileNamesList = blogPostFileNamesList.map(item => {
      // Replace '-' with ' '
      let updatedItem = item.replace(/-/g, ' ');

      // Title case the updated item
      updatedItem = updatedItem.split(' ').map(part => {
          return part.split(' ').map(word => {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }).join(' ');
      }).join(' ');

      return updatedItem;
  });

  const model = shuffleArray(['gpt-4o', 'gpt-3.5-turbo'])[0];
  const temp = shuffleArray([0.08, 0.08, 0.07, 0.09, 1, 0.08, 0.07, 0.09])[0];
  const top_p = shuffleArray([0.08, 0.07, 0.09, 0.08])[0];
  try {
      const completion = await openai.chat.completions.create({
          model: model,
          // https://community.openai.com/t/cheat-sheet-mastering-temperature-and-top-p-in-chatgpt-api/172683
          temperature: temp,
          top_p: top_p,
          messages: [
              {
                role: "system",
                content: `
Persona: You are skilled in writing unique, witty, and engaging blog post titles that relate to job searching, resume writing, resume writing services, and thejob application process.
Rules:
1. The output should be creative, informative, and engaging blog post loosely related to resume writing, job searching, and job seeking.
2. Use varying styles, sentence structure, and phrasing for the title of the article. Be different from these examples: ${blogPostFileNamesList}.
3. Optimize for SEO, incorporate the top keyword search words and phrases while sounding natural.
`
              },
              {
                  role: "user",
                  content: `Generate me a new blog post title in string format, title case.`,
              },
          ],
      });

      let content = completion.choices[0].message;
      // content = content.trim();

      return content;
  } catch (error) {
      console.error("Error fetching getBlogPostTitleCompletion:", error);
      return null;
  }
}
//
//
//
// blog post content




async function getBlogPostCompletion(blogTitle, blankTemplate) {
		// console.log({blogPostFileNamesList, template});
    // console.log('___')

        //
        //
        //
        // list of existing file names
        // blogPostFileNamesList = blogPostFileNamesList.map(item => {
        //     // Replace '-' with ' '
        //     let updatedItem = item.replace(/-/g, ' ');
        //
        //     // Title case the updated item
        //     updatedItem = updatedItem.split(' ').map(part => {
        //         return part.split(' ').map(word => {
        //             return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        //         }).join(' ');
        //     }).join(' ');
        //
        //     return updatedItem;
        // });

        //
        //
        //
        // personas
        const personas =
            [
              {
                "name": "Alice Zhu",
                "job": "senior hiring manager",
                "background": "from Vancouver, Canada, known for her engaging and motivational prose, often weaving in anecdotes from her 15 years in the hiring industry. She provides practical advice rooted in real-world experiences, coaching readers on how to navigate complex hiring processes with confidence."
              },
              {
                "name": "Ian Vensel",
                "job": "senior business development manager",
                "background": "from Renton, WA, detailed, analytical, and empathetic, aimed at professionals looking to transition careers. With over a decade in career consulting, he blends psychological insights with career strategies, making his blog a go-to for transformative career advice. You can get in touch with him on LinkedIn: https://www.linkedin.com/in/ian-vensel-%F0%9F%8F%81-a2047146 and at https://empirestrategists.com."
              },
              {
                "name": "Amanda Peete",
                "job": "senior HR professional",
                "background": "from Silicon Valley, California, balanced with humor and authority, breaking down HR policies and industry trends into digestible pieces. Her 20 years of HR experience allow her to provide a nuanced perspective on employee relations, compliance, and organizational development."
              },
              {
                "name": "David Collins",
                "job": "job recruiter",
                "background": "from Boston, Massachusetts, SEO-savvy, friendly, fast-paced and full of actionable tips for job seekers. With over 12 years in recruitment, his writing focuses on networking, personal branding, and the nuances of job market trends, offering readers clear and concise guidance to land their ideal job."
              },
              {
                "name": "Alicia Graham",
                "job": "tech recruiter",
                "background": "from Cambridge, Massachusetts, technical yet accessible, perfect for tech professionals and job seekers. Her 10-year tech recruitment background allows her to delve into specific industry requirements, coding interview tips, and the latest tech trends, all while maintaining a conversational tone."
              },
              {
                "name": "Alec Bondahl",
                "job": "finance recruiting manager",
                "background": "from Seattle, Washington, a combination of thorough analysis with a touch of wit. His expertise in finance recruitment over the last 14 years shines through in his detailed breakdowns of hiring trends, salary negotiations, and the qualities top financial firms seek in candidates."
              },
              {
                "name": "Olivia Reed",
                "job": "resume specialist and blogger",
                "background": "from Las Vegas, Nevada, precise, structured, SEO-friendly, and immensely helpful. With a sharp eye for detail honed over a decade of professional resume writing, she provides readers with templates, dos and don'ts, and the latest trends in resume format and content."
              },
              {
                "name": "Sarah Cole",
                "job": "SEO strategist and content creator",
                "background": "from Portland, Oregon, rich in SEO terminology yet presented in an engaging, easy-to-understand manner. Her dual expertise in content creation and SEO over 8 years helps job seekers not only craft optimized resumes but also build an online presence that stands out."
              },
              {
                "name": "Gregory Shaw",
                "job": "corporate recruiter",
                "background": "from St. Louis, Missouri, direct, no-nonsense, and packed with insider insights. With 15 years in corporate recruitment, he reveals what large companies are truly looking for, offering strategic advice on interviews, company culture, and long-term career planning."
              },
              {
                "name": "Eli Lewis",
                "job": "sales recruitment specialist",
                "background": "from Detroit, Michigan, vibrant and persuasive, much like her approach to sales recruitment over the past 12 years. She excels at narrating success stories, crafting compelling pitches, and providing tips on negotiation and closing deals in job searches."
              }
            ];

        const persona = shuffleArray(personas)[0];
        // console.log({persona});


        // const roles = [
        //     'senior hiring manager', 'senior career consultant', 'senior hr professional',
        //     'job recruiter', 'recruiting manager', 'tech recruiter', 'finance recruiting manager',
        //     'resume writer', 'hiring manager', 'accountant', 'banker', 'hr professional', 'SEO strategist and author', 'corporate recruiter',
        //     'sales recruiter', 'sales manager', 'engineer', 'bank teller', 'professional resume writer',
        // ];
        // const job_role = shuffleArray(roles)[0];

        // const amount = shuffleArray(['very little', 'many', 'no', 'very few, if any', 'no', 'very little', 'some', 'no', 'no', 'sparse', 'no', 'no', 'minimal', 'some (within reason)'])[0];
        const voice = shuffleArray(['first person', 'second person', 'active', 'passive', 'second person', 'direct', 'second person', 'professional'])[0];
        // console.log({voice});


    const model = shuffleArray(['gpt-4o', 'gpt-3.5-turbo'])[0];
    const temp = shuffleArray([0.08, 0.08, 0.07, 0.09, 1, 0.08, 0.07, 1, 0.08])[0];
    const top_p = shuffleArray([0.08, 0.07, 0.08, 0.09, 0.08])[0];
    // console.log({persona, model, temp, top_p});

    try {
        const completion = await openai.chat.completions.create({
            model: model,
            // https://community.openai.com/t/cheat-sheet-mastering-temperature-and-top-p-in-chatgpt-api/172683
            temperature: temp,
            top_p: top_p,
            messages: [
                {
                	role: "system",
                  content: `
Persona: You are ${persona.name}, a ${persona.job}. You are skilled in writing unique, witty, and engaging blog post, this one is titled "${blogTitle}".

The readers of your output are new grads, job seekers, and professionals.

Rules:
1. The output should be creative, informative, and engaging blog post loosely related to resume writing, job searching, and job seeking.
2. Avoid typos, sentence structure issues, and grammar problems. Capitalize proper nouns, and expand acronyms when necessary.
3. Your dialect and writing style is ${persona.background}, and you tend to write in a ${voice} voice.
4. The output canNOT have single commas in the content. avoid contractions.
5. Optimize for SEO, incorporate the top keyword search words and phrases while sounding natural.
6. Follow the same imports and html formatting as this template: ${blankTemplate} (but do add tags (spans, strongs, italics, etc.) inside of sections with the 'custom_html' class).
7. In the conclusion, make sure to include a call to action to visit the resume generator page using these link props: <a href="https://www.resumai.services/resume-generator" className="text-blue-700 hover:underline" title="ResumAI - Resume Generator">...</a>.
`
                },
                {
                    role: "user",
                    content: `Generate me a new blog post in the expected 'example post html' format.`,
                },
            ],
        });

        let content = completion.choices[0].message;
        // console.log(content);
        // console.log(typeof content);
        //
        // content = content.replaceAll('```jsx', '').replaceAll('```', '');
          // .replaceAll("'", '"');

        return content;
    } catch (error) {
        console.error("Error fetching getBlogPostCompletion:", error);
        return null;
    }
}

//
//
//


// Function to append JSON object to a JSON file
function appendJsonObject(filePath, newObject) {
    fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
            if (readErr.code === 'ENOENT') {
                // File does not exist, create a new one with an array containing the new object
                const newContent = JSON.stringify([newObject], null, 2);
                fs.writeFile(filePath, newContent, 'utf8', (writeErr) => {
                    if (writeErr) throw writeErr;
                    // console.log('File created and new object added!');
                });
            } else {
                throw readErr;
            }
        } else {
            // Parse the existing file content
            let jsonContent;
            try {
                jsonContent = JSON.parse(data);
            } catch (parseErr) {
                throw new Error('Error parsing JSON data: ' + parseErr);
            }

            // Check if the content is an array
            if (!Array.isArray(jsonContent)) {
                throw new Error('JSON content is not an array');
            }

            // Append the new object to the array
            jsonContent.push(newObject);

            // Convert back to JSON string
            const updatedContent = JSON.stringify(jsonContent, null, 2);

            // Write the updated content back to the file
            fs.writeFile(filePath, updatedContent, 'utf8', (writeErr) => {
                if (writeErr) throw writeErr;
                // console.log('New blog post object appended successfully!');
            });
        }
    });
}


//
//
//


(async () => {
    const existingBlogPostData = await getCurrentStaticBlogPostData();

    // console.log(existingBlogPostData)

    // had to move this to here.
    // let exampleBlogPostFileContents = '';
    // try {
    //     const examplePostPath = `${blogPostFolderBasePath}/${existingBlogPostData.tenBlogPostFileNames[0]}/page.tsx`;
    //     // console.log(examplePostPath)
    //     exampleBlogPostFileContents = await fs.promises.readFile(examplePostPath, 'utf8');
    //     // console.log(typeof exampleBlogPostFileContents);
    // } catch (error) {
    //     console.error('error getting example file');
    //     return 'FAILED: error getting example file';
    // }
    // console.log({exampleBlogPostFileContents});

    let blankBlogPostTemplate = '';
    try {
        const path = `${blogPostFolderBasePath}/example-blog-post/page.tsx`;
        // console.log(path)
        blankBlogPostTemplate = await fs.promises.readFile(path, 'utf8');
    } catch (error) {
        console.error('error getting example file');
        return 'FAILED: error getting example file';
    }
    // console.log({ existingBlogPostData });

    const aiResponseTitle = await getBlogPostTitleCompletion(
      existingBlogPostData.tenBlogPostFileNames,
    );
    let postTitle = aiResponseTitle.content.trim().replaceAll('"', '').replaceAll("'", "");
    // console.log({blogTitle})

    const aiResponseBlogPost = await getBlogPostCompletion(
        postTitle,
        blankBlogPostTemplate,
    );
    // console.log('AI RESPONSE: ', aiResponse.content)
    // console.log(aiResponseBlogPost)

    let blogPostFileContents = aiResponseBlogPost.content;
    // console.log(content);
    // console.log(typeof content);

    blogPostFileContents = blogPostFileContents.replaceAll('```javascript', '').replaceAll('```', '').replaceAll('jsx', '').replaceAll("'", "&apos;");
    // console.log({blogPostFileContents})
    // const postTitle = parseTitleFromString(blogPostFileContents);
    const fileName = postTitle.replaceAll(' ', '-').replaceAll("'", "").replaceAll(":", "").toLowerCase();

    //
    //
    //
    // FOR BLOG POSTS
    const firstPTagContent = getFirstPTagContent(blogPostFileContents);
    // console.log(firstPTagContent);

    console.log('___________________________________________________');
    console.log(' ');
    console.log(' ');
    const phrases = [
        'Click here to read more',
        'Click here to read the full article',
        'Learn more about generating a new resume',
        'Read more:',
        'Professionalize your resume today!',
        'Start your career journey and generate a new resume today!',
        'Continue reading',
        'Generate a new resume today!',
        'Continue reading',
        'Generate your new resume today!',
    ];
    const phrase = shuffleArray(phrases)[0];
    const url = `${webpageBlogPostBaseUrl}/${fileName}`;

    console.log(`${firstPTagContent}

        ${phrase} ${url}`
    );
    console.log(' ');
    console.log(' ');
    console.log('___________________________________________________');
    // console.log({
    //   blogPostFileContents, firstPTagContent, url, exampleBlogPostFileContents
    // })

    const newBlogPostObject = {
        date: new Date(),
        file: fileName,
        title: postTitle,
        // data: aiResponse.content,
    };

    // add blog post record to static list file (for rendering)
    appendJsonObject(externalJsonBlogPostList, newBlogPostObject);

    // add new new blog post folder container file
    await createFolderAndFile(fileName, blogPostFileContents);
})();
