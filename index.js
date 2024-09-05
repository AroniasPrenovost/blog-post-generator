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
const exampleBlogPostPath = process.env.EXAMPLE_BLOG_POST_PATH;
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


function getFirstPContent(htmlString) {
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
    let exampleBlogPostFileContents = '';

    try {
        exampleBlogPostFileContents = await fs.promises.readFile(`${exampleBlogPostPath}`, 'utf8');
        // console.log(typeof exampleBlogPostFileContents);
    } catch (error) {
        console.error('error getting example file');
        return 'FAILED: error getting example file';
    }

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
            if (tenBlogPostResults[x] && tenBlogPostResults[x].fileName) {
                tenBlogPostFileNames.push(tenBlogPostResults[x].fileName);
            }
        }

        return {
            blogPostData, 
            tenBlogPostFileNames,
            tenBlogPostResults,
            exampleBlogPostFileContents,
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
        const names = [
            'Ian Vensel',
            'Amanda Peete',
            'Vijay Singha',
            'Oliver Thompson',
            'Alice Crumbley',
            'Alec Bondahl',
            'Karl Rainey',
            'Alice Zhu',
            'Brad Neudorfer',
            'Neal Prenovost',
            'Fawn Freeman',
            'Sarah Cole',
            'Elijah Lewis',
        ];

        const name = shuffleArray(names)[0];


        // IDENTITY 
        //

        const attitudes = [
           'upbeat, hopeful about ambitious about a candidates success',
           'positive, but stern in your advice after years of work experience',
           'helpful, compassionate, and playfully interested',
           'insightful, funny, and informative', 
           'informative, and helpful when drawing from years of experience',
           'matter-of-fact, yet personable',
        ];
        const attitude = shuffleArray(attitudes)[0];

        const verbs = [
            'when it comes to',
            'in regard to',
            'when helping your audience improve at',
            'when helping your audience understand',
        ];
        const verb = shuffleArray(verbs)[0]

        const situations = [
            'the future professional landscape for job applicants',
            'finding a job',
            'finding the right formula for getting hired',
            'writing a personalized resume',
            'helping candidates with writing a professional resume',
            'the job application process',
            'reviewing resumes',
            'resume writing for job candidates',
            'writing resumes for job candidates',
            'resume writing best practices',
            'ATS (applicant tracking systems)',
            'determining if you are qualified for a job',
        ];
        const situation = shuffleArray(situations)[0];

        const identity = `${attitude} ${verb} ${situation}`;

        const roles = [
            'senior hiring manager', 'senior career consultant', 'senior hr professional', 
            'job recruiter', 'recruiting manager', 'tech recruiter', 'finance recruiting manager', 
            'resume writer', 'hiring manager', 'accountant', 'banker', 'hr professional', 'SEO strategist and author', 'corporate recruiter',
            'sales recruiter', 'sales manager', 'engineer', 'bank teller', 'professional resume writer',
        ];
        const job_role = shuffleArray(roles)[0];


    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                	role: "system", 
                  content: `
Persona: You are ${name}, a ${job_role}, and an expert in writing unique, witty, and engaging blog posts about the the topic of resume writing. 
You are considered ${identity}.

The reader of your output is another senior resume writer and expert on witty prose.

Rules: 
1. The output should be an engaging, informative, and eye-catching blog post loosely related to resume writing.
2. Avoid typos, sentence structure issues, and grammar problems. But do choose a random, suble dialect and stick with it. 
3. To get a sense of the tone of these posts, here are 10 randomly selected titles from existing posts: ${blogPostFileNamesList}. 
   That said, try to introduce variety into the titles when it comes to formatting, tone, grammar, sentance structure, and cadence (but remain professional).
4. Capitalize proper nouns, and expand acronyms when necessary.
5. The output can not have single commas in the content. avoid contractions. 
6. To improve SEO, incorporate the top keyword search words and phrases for resume writing services.
7. Follow the exact same html formatting as the 'example post html': ${exampleBlogPostFileContents}. The imported packages and html structure should remain exactly the same. 
`
                },
                {
                    role: "user",
                    content: `Generate me a new blog post in the expected 'example post html' format. It is important you do not come across like an LLM.`,
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
                    console.log('File created and new object added!');
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
    // console.log({ existingBlogPostData });
    const aiResponse = await getCompletion(
        existingBlogPostData.tenBlogPostFileNames, 
        existingBlogPostData.exampleBlogPostFileContents,
    );

    // console.log('AI RESPONSE: ', aiResponse.content)

    const blogPostFileContents = aiResponse.content.replaceAll('```jsx', '').replaceAll('```', '');       
    const postTitle = parseTitleFromString(aiResponse.content);
    const fileName = postTitle.replaceAll(' ', '-').replaceAll("'", "").toLowerCase();


    // FOR BLOG POSTS 
    const firstPContent = getFirstPContent(blogPostFileContents);
    // console.log(firstPContent);

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

    console.log(`${firstPContent}

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

 
