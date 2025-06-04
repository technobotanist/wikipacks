// Select the pack element, cards container, and UI panel elements
const packElement = document.getElementById('pack');
const cardsContainer = document.getElementById('cards');
const binder = []; // Array to hold the cards added to the binder
let binderPopup = document.getElementById('binder-popup');
let binderContainer = document.getElementById('binder-container');
let navPanel = document.getElementById('nav-panel'); // User-interface panel

// Add HTML structure for the navigation panel if it doesn't exist
if (!navPanel) {
    const body = document.querySelector('body');
    const newNavPanel = document.createElement('div');
    newNavPanel.id = 'nav-panel';
    newNavPanel.innerHTML = `
        <div class="nav-panel">
            <button id="view-binder-button">View Binder Page</button>
            <button id="open-pack-button">Open Pack</button>
            <button id="export-binder-button">Export Binder Page</button>
            <button id="name-binder-button">Name Binder Page</button>
        </div>
        <div id="binder-popup" class="binder-popup">
            <div class="binder-header">
                <span class="binder-name">Binder</span>
                <button id="binder-close-button">Close</button>
            </div>
            <div id="binder-container" class="binder-container"></div>
        </div>
    `;
    body.appendChild(newNavPanel);
    
    // Reassign elements after adding them to the DOM
    binderPopup = document.getElementById('binder-popup');
    binderContainer = document.getElementById('binder-container');
    navPanel = document.getElementById('nav-panel');
}

// Add an event listener to open the pack when clicked
packElement.addEventListener('click', () => {
    openPack();
});

function openPack() {
    // Clear existing cards
    cardsContainer.innerHTML = '';
    
    // Hide the pack element to simulate it opening
    packElement.style.transition = 'transform 1s ease-in-out';
    packElement.style.transform = 'rotateY(180deg) scale(0)'; // Improved animation: rotation and scaling down

    // Start revealing cards after a delay (simulate pack opening)
    setTimeout(() => {
        revealCards();
    }, 1200);
}

// Function to reveal cards
function revealCards() {
    for (let i = 0; i < 5; i++) {
        // Create a card with some delay between each
        createCard(cardsContainer, i * 300);
    }
}

// Create a card element and add it to the container
async function createCard(container, delay) {
    try {
        let isValid = false;
        let article = null;

        // Fetch a valid Wikipedia article with an image
        while (!isValid) {
            article = await fetchRandomWikipediaArticle();
            if (article && article.imageUrl) {
                isValid = true;
            }
        }

        if (article) {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.transition = `transform 0.5s ease ${delay}ms, opacity 0.5s ease ${delay}ms`;
            card.style.transform = 'scale(0)';  // Start small
            card.style.opacity = '0';  // Invisible initially

            // Set the card content
            const title = document.createElement('div');
            title.classList.add('card-title');
            title.innerText = article.title;

            const imgContainer = document.createElement('div');
            imgContainer.classList.add('card-image-container');

            const img = document.createElement('img');
            img.classList.add('card-image');
            img.src = article.imageUrl;

            imgContainer.appendChild(img);
            card.appendChild(title);
            card.appendChild(imgContainer);
            container.appendChild(card);

            // Calculate prominence and set color
            const prominence = await fetchPageviews(article.title);
            applyColorToCard(card, prominence, article.title);

            // Reveal the card with a slight animation delay
            setTimeout(() => {
                card.style.transform = 'scale(1)';  // Grow to full size
                card.style.opacity = '1';  // Fade in
            }, delay);

            // Add event listener for right-click or long press to add to binder
            card.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                addToBinder(article);
            });
        }
    } catch (error) {
        console.error('Failed to create a card:', error);
    }
}

// Fetch a random Wikipedia article
async function fetchRandomWikipediaArticle() {
    try {
        const response = await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&generator=random&grnnamespace=0&prop=pageimages|extracts&piprop=original|thumbnail&exintro&explaintext&pithumbsize=500&origin=*');
        if (!response.ok) {
            console.error('Wikipedia API returned an error:', response.statusText);
            return null;
        }

        const data = await response.json();
        const pages = data.query.pages;
        for (const pageId in pages) {
            const article = pages[pageId];
            if (article && article.thumbnail) {
                return {
                    title: article.title,
                    imageUrl: article.thumbnail.source,
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching Wikipedia article:', error);
        return null;
    }
}

// Fetch pageviews to determine article prominence
async function fetchPageviews(title) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // Last 30 days

        const start = startDate.toISOString().split('T')[0].replace(/-/g, '');
        const end = endDate.toISOString().split('T')[0].replace(/-/g, '');

        const response = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(title)}/daily/${start}/${end}`);
        if (!response.ok) {
            console.error('Pageviews API returned an error:', response.statusText);
            return 0;
        }

        const data = await response.json();
        let totalViews = 0;
        if (data.items) {
            data.items.forEach(item => {
                totalViews += item.views;
            });
        }

        return totalViews;
    } catch (error) {
        console.error('Error fetching pageviews:', error);
        return 0;
    }
}

// Apply color to card based on prominence
function applyColorToCard(card, prominence, title) {
    const maxProminence = 100000;
    const minColor = [255, 249, 196]; // Light yellow (#FFF9C4)
    const maxColor = [211, 47, 47];   // Deep red (#D32F2F)

    // Introduce variability using title hash to add uniqueness
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variability = (hash % 30) / 100; // Adds up to 30% variability in color

    const ratio = Math.min(prominence / maxProminence, 1) + variability;
    const clampedRatio = Math.min(ratio, 1); // Ensure ratio does not exceed 1

    const interpolatedColor = minColor.map((minVal, index) => 
        Math.round(minVal + clampedRatio * (maxColor[index] - minVal))
    );
    const colorString = `rgb(${interpolatedColor.join(',')})`;

    card.style.backgroundColor = colorString;
}

// Add a card to the binder
function addToBinder(article) {
    if (binder.length < 12) {
        binder.push(article);
    } else {
        alert('Your binder page is full!');
    }
    updateBinderView();
}

// Update the binder popup view
function updateBinderView() {
    if (!binderContainer) {
        console.error('Binder container is not found');
        return;
    }
    binderContainer.innerHTML = ''; // Clear existing cards
    binder.forEach((article) => {
        const card = document.createElement('div');
        card.classList.add('card');

        const title = document.createElement('div');
        title.classList.add('card-title');
        title.innerText = article.title;

        const imgContainer = document.createElement('div');
        imgContainer.classList.add('card-image-container');

        const img = document.createElement('img');
        img.classList.add('card-image');
        img.src = article.imageUrl;

        imgContainer.appendChild(img);
        card.appendChild(title);
        card.appendChild(imgContainer);
        binderContainer.appendChild(card);
    });
}

// Function to export binder as JSON
function exportBinder() {
    const binderData = JSON.stringify(binder, null, 2);
    const blob = new Blob([binderData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binder.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Function to toggle binder popup view
function toggleBinder() {
    if (!binderPopup) {
        console.error('Binder popup is not found');
        return;
    }
    if (binderPopup.style.display === 'none' || binderPopup.classList.contains('hidden')) {
        binderPopup.style.display = 'block';
        viewBinderButton.innerText = 'Hide Binder Page';
    } else {
        binderPopup.style.display = 'none';
        viewBinderButton.innerText = 'View Binder Page';
    }
}

// Event listeners for showing, hiding, and exporting the binder
const viewBinderButton = document.getElementById('view-binder-button');
viewBinderButton.addEventListener('click', toggleBinder);

const binderCloseButton = document.getElementById('binder-close-button');
binderCloseButton.addEventListener('click', toggleBinder);

const exportButton = document.getElementById('export-binder-button');
exportButton.addEventListener('click', exportBinder);

// New UI Panel Buttons
const openPackButton = document.getElementById('open-pack-button');
openPackButton.addEventListener('click', openPack);

const nameBinderButton = document.getElementById('name-binder-button');
nameBinderButton.addEventListener('click', () => {
    const binderName = prompt('Enter a name for this binder page:');
    if (binderName) {
        binderPopup.querySelector('.binder-name').innerText = binderName;
    }
});
