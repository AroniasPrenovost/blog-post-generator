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
const staticBlogPostStoragePath = process.env.STATIC_BLOG_POST_STORAGE_PATH;
const newBlogPostFolderBasePath = process.env.NEW_BLOG_POST_FOLDER_BASE_PATH;
const websiteBaseBlogFolderPath = process.env.WEBSITE_BASE_BLOG_FOLDER_PATH;

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
    const folderPath = `${newBlogPostFolderBasePath}/${folderName}`;
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


    // get the static blog post data
    try {
        const data = await fs.promises.readFile(staticBlogPostStoragePath, 'utf8');
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
//



async function getCompletion(blogPostFileNamesList, exampleBlogPostFileContents) {
		// console.log({blogPostFileNamesList, exampleBlogPostFileContents});
		// return blogPostFileNamesList;
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
 

         // IDENTITY 
        //

        //
        // const names = [
        //     'Ian Vensel',
        //     'Ac',
        //     'Vijay Singha',
        //     'Oliver Thompson',
        //     'Alice Crumbley',
        //     'Alec Bondahl',
        //     'Karl Rainey',
        //     'Alice Zhu',
        //     'Brad Neudorfer',
        //     'Neal Prenovost',
        //     'Fawn Freeman',
        //     'Sarah Cole',
        //     'Elijah Lewis',
        // ];

        // const name = shuffleArray(names)[0];




        // const attitudes = [
        //    'upbeat, hopeful about ambitious about a candidates success',
        //    'positive, but stern in your advice after years of work experience',
        //    'helpful, compassionate, and playfully interested',
        //    'insightful, funny, and informative', 
        //    'informative, and helpful when drawing from years of experience',
        //    'matter-of-fact, yet personable',
        // ];
        // const attitude = shuffleArray(attitudes)[0];

        // const verbs = [
        //     'when it comes to',
        //     'in regard to',
        //     'when helping your audience improve at',
        //     'when helping your audience understand',
        // ];
        // const verb = shuffleArray(verbs)[0]

        // const situations = [
        //     'the future professional landscape for job applicants',
        //     'finding a job',
        //     'finding the right formula for getting hired',
        //     'writing a personalized resume',
        //     'helping candidates with writing a professional resume',
        //     'the job application process',
        //     'reviewing resumes',
        //     'resume writing for job candidates',
        //     'writing resumes for job candidates',
        //     'resume writing best practices',
        //     'ATS (applicant tracking systems)',
        //     'determining if you are qualified for a job',
        // ];
        // const situation = shuffleArray(situations)[0];

        // const identity = `${attitude} ${verb} ${situation}`;

        // const roles = [
        //     'senior hiring manager', 'senior career consultant', 'senior hr professional', 
        //     'job recruiter', 'recruiting manager', 'tech recruiter', 'finance recruiting manager', 
        //     'resume writer', 'hiring manager', 'accountant', 'banker', 'hr professional', 'SEO strategist and author', 'corporate recruiter',
        //     'sales recruiter', 'sales manager', 'engineer', 'bank teller', 'professional resume writer',
        // ];
        // const job_role = shuffleArray(roles)[0];

        // const amount = shuffleArray(['very little', 'many', 'no', 'very few, if any', 'no', 'very little', 'some', 'no', 'no', 'sparse', 'no', 'no', 'minimal', 'some (within reason)'])[0];
        const voice = shuffleArray(['first person', 'second person', 'active', 'passive', 'second person', 'direct', 'second person', 'professional'])[0];

        // console.log({
        //     amount,
        //     persona,
        //     blogPostFileNamesList,
        //     exampleBlogPostFileContents,
        // })


    const model = shuffleArray('gpt-4o', 'gpt-3.5-turbo')[0];
    const temp = shuffleArray(0.08, 0.08, 0.07, 0.09, 1, 0.08, 0.07, 0.06, 0.07)[0];
    const top_p = shuffleArray([0.08, 0.07, 0.06, 0.09, 0.08])[0];

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
Persona: You are ${persona.name}, a ${persona.job}. You are skilled in writing unique, witty, and engaging blog posts related to the topic of resume writing. 

The readers of your output are new grads, job seekers, and professionals interested in resume writing services as they embark on their job search.

Rules: 
1. The output should be creative, informative, and engaging blog post loosely related to resume writing, job searching, and job seeking.
2. Avoid typos, sentence structure issues, and grammar problems.
3. Your dialect and writing style is ${persona.background}, and you tend to write in a ${voice} voice. 
4. Use varying styles, sentence structure, and phrasing for the title of the article. The verbiage, tone, and format should not repeat these examples: ${blogPostFileNamesList}. 
5. Be creative and make the tone of your post different (in style and verbiage) from existing examples.
6. Capitalize proper nouns, and expand acronyms when necessary.
7. The output canNOT have single commas in the content. avoid contractions. 
8. Optimize for SEO, incorporate the top keyword search words and phrases for resume writing services while sounding natural.
9. Follow the exact same html formatting as the 'example post html' (except when  a section has the 'custom_html' class): ${exampleBlogPostFileContents}. The imported packages and html structure should remain exactly the same. 
`
                },
                {
                    role: "user",
                    content: `Generate me a new blog post in the expected 'example post html' format.`,
                },
            ],
        });

        return completion.choices[0].message;
    } catch (error) {
        console.error("Error fetching completion:", error);
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

    // had to move this to here.
    let exampleBlogPostFileContents = '';
    try {
        const examplePostPath = `${newBlogPostFolderBasePath}/${existingBlogPostData.tenBlogPostFileNames[0]}/page.tsx`;
        // console.log(examplePostPath)
        exampleBlogPostFileContents = await fs.promises.readFile(examplePostPath, 'utf8');
        // console.log(typeof exampleBlogPostFileContents);
    } catch (error) {
        console.error('error getting example file');
        return 'FAILED: error getting example file';
    }

    // console.log({exampleBlogPostFileContents, existingBlogPostData});


    // console.log({ existingBlogPostData });
    const aiResponse = await getCompletion(
        existingBlogPostData.tenBlogPostFileNames, 
        exampleBlogPostFileContents,
    );

    // console.log('AI RESPONSE: ', aiResponse.content)

    const blogPostFileContents = aiResponse.content.replaceAll('```jsx', '').replaceAll('```', '').replaceAll("'", '"');       
    const postTitle = parseTitleFromString(aiResponse.content);
    const fileName = postTitle.replaceAll(' ', '-').replaceAll("'", "").toLowerCase();


    // FOR BLOG POSTS 
    const firstPTagContent = getFirstPTagContent(blogPostFileContents);
    // console.log(firstPTagContent);

    console.log('|||||||||||||||||||||||||||||||||||||||||');
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
    const url = `${websiteBaseBlogFolderPath}/${fileName}`;

    console.log(`${firstPTagContent}

        ${phrase} ${url}`
    );

    console.log(' ');
    console.log(' ');
    console.log('|||||||||||||||||||||||||||||||||||||||||');

    // 
    //

    // 

    const newBlogPostObject = {
        date: new Date(),
        file: fileName,
        title: postTitle,
        // data: aiResponse.content,
    };
    appendJsonObject(staticBlogPostStoragePath, newBlogPostObject);

    // append file to new file 
     await createFolderAndFile(fileName, blogPostFileContents);
})();

 
