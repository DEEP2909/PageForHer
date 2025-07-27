document.addEventListener('DOMContentLoaded', () => {

    const backendUrl = 'http://127.0.0.1:5000';
    const userName = "Prachi";
    let countdownInterval;

    // These will be populated from the backend
    let specialEvents = [];
    let todos = [];

    // --- ELEMENT SELECTORS (remains the same) ---
    const greetingEl = document.getElementById('greeting');
    const clockEl = document.getElementById('clock');
    const temperatureEl = document.getElementById('temperature');
    const conditionEl = document.getElementById('condition');
    const locationEl = document.querySelector('.weather-widget .location');
    const eventTitleEl = document.getElementById('event-title');
    const eventDateEl = document.getElementById('event-date');
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minsEl = document.getElementById('mins');
    const secsEl = document.getElementById('secs');
    const settingsBtn = document.getElementById('settings-btn');
    const modalContainer = document.getElementById('modal-container');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const eventsListEl = document.getElementById('events-list');
    const addEventForm = document.getElementById('add-event-form');
    const newEventNameInput = document.getElementById('new-event-name');
    const newEventDateInput = document.getElementById('new-event-date');
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const uploadBtn = document.getElementById('upload-btn');
    const photoUploadInput = document.getElementById('photo-upload');

    // --- SYNC FUNCTIONS (NEW) ---
    // These functions send the updated lists to the backend
    async function syncTodos() {
        await fetch(`${backendUrl}/todos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todos)
        });
    }

    async function syncEvents() {
        await fetch(`${backendUrl}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(specialEvents)
        });
        startCountdown(); // Recalculate countdown after updating events
    }


    // --- RENDERING AND EVENT HANDLING FUNCTIONS (UPDATED) ---

    // To-Do functions now call syncTodos() after every change
    function renderTodos() {
        todoList.innerHTML = '';
        if (todos.length === 0) {
            todoList.innerHTML = '<li>No tasks yet. Add one above!</li>';
            return;
        }
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.textContent = todo.text;
            li.className = todo.completed ? 'completed' : '';
            li.onclick = () => {
                todos[index].completed = !todos[index].completed;
                renderTodos();
                syncTodos(); // Sync on toggle
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                todos.splice(index, 1);
                renderTodos();
                syncTodos(); // Sync on delete
            };
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if (text) {
            todos.push({ text: text, completed: false });
            renderTodos();
            syncTodos(); // Sync on add
            todoInput.value = '';
        }
    });

    // Events modal functions now call syncEvents() after every change
    function renderEventsList() {
        eventsListEl.innerHTML = '';
        if (specialEvents.length === 0) {
            eventsListEl.innerHTML = '<li>No special dates added yet.</li>';
            return;
        }
        specialEvents.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach((event, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${event.name}</strong> (${new Date(event.date + 'T00:00:00').toLocaleDateString()})</span>`;
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => {
                specialEvents.splice(index, 1);
                renderEventsList();
                syncEvents(); // Sync on delete
            };
            li.appendChild(deleteBtn);
            eventsListEl.appendChild(li);
        });
    }
    addEventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (newEventNameInput.value.trim() && newEventDateInput.value) {
            specialEvents.push({ name: newEventNameInput.value.trim(), date: newEventDateInput.value });
            renderEventsList();
            syncEvents(); // Sync on add
            addEventForm.reset();
        }
    });


    // --- INITIALIZATION (UPDATED TO FETCH ALL DATA) ---
    async function init() {
        // Fetch all data from the backend in parallel
        const [eventsRes, todosRes, backgroundRes] = await Promise.all([
            fetch(`${backendUrl}/events`),
            fetch(`${backendUrl}/todos`),
            fetch(`${backendUrl}/background`)
        ]);

        specialEvents = await eventsRes.json();
        todos = await todosRes.json();
        const backgroundData = await backgroundRes.json();
        
        // Now that we have the data, render everything
        if (backgroundData.url) {
            document.body.style.backgroundImage = `url(${backendUrl}${backgroundData.url})`;
        }
        
        renderTodos();
        startCountdown();
        
        // Other initializations
        updateTimeAndGreeting(); 
        setInterval(updateTimeAndGreeting, 1000);
        getLocationAndFetchWeather();
        setInterval(getLocationAndFetchWeather, 600000);
    }
    
    // All other functions (weather, countdown logic, background upload, etc.) can remain the same
    // (Ensure they are present in your file from the previous steps)
    function getLocationAndFetchWeather() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    getWeather(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    console.log("Could not get device location. Defaulting to Bhopal.");
                    locationEl.textContent = "📍 Bhopal, India (Default)";
                    getWeather(23.2599, 77.4126); // Bhopal coordinates
                }
            );
        } else {
            console.log("Geolocation is not supported. Defaulting to Bhopal.");
            locationEl.textContent = "📍 Bhopal, India (Default)";
            getWeather(23.2599, 77.4126); // Bhopal coordinates
        }
    }
    async function getWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather data not available');
            const data = await response.json();
            temperatureEl.textContent = `${Math.round(data.current.temperature_2m)}°C`;
            const weather = getWeatherDescription(data.current.weather_code, data.current.is_day);
            conditionEl.textContent = weather.text;
            document.querySelector('.weather-widget h2 i').className = weather.icon;
            if (lat !== 23.2599) { locationEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> Your Location`; }
        } catch (error) { console.error("Weather fetch error:", error); temperatureEl.textContent = "Error"; }
    }
    function getWeatherDescription(code, isDay) {
        if (code <= 1 && !isDay) return { text: "Clear Night", icon: "fa-solid fa-moon" };
        const descriptions = { 0: { text: "Clear Sky", icon: "fa-solid fa-sun" }, 1: { text: "Mainly Clear", icon: "fa-solid fa-sun" }, 2: { text: "Partly Cloudy", icon: "fa-solid fa-cloud-sun" }, 3: { text: "Overcast", icon: "fa-solid fa-cloud" }, 45: { text: "Fog", icon: "fa-solid fa-smog" }, 48: { text: "Rime Fog", icon: "fa-solid fa-smog" }, 51: { text: "Light Drizzle", icon: "fa-solid fa-cloud-rain" }, 53: { text: "Drizzle", icon: "fa-solid fa-cloud-rain" }, 55: { text: "Dense Drizzle", icon: "fa-solid fa-cloud-rain" }, 61: { text: "Slight Rain", icon: "fa-solid fa-cloud-showers-heavy" }, 63: { text: "Moderate Rain", icon: "fa-solid fa-cloud-showers-heavy" }, 65: { text: "Heavy Rain", icon: "fa-solid fa-cloud-showers-heavy" }, 80: { text: "Slight Showers", icon: "fa-solid fa-cloud-showers-heavy" }, 81: { text: "Moderate Showers", icon: "fa-solid fa-cloud-showers-heavy" }, 82: { text: "Violent Showers", icon: "fa-solid fa-cloud-showers-heavy" }, 95: { text: "Thunderstorm", icon: "fa-solid fa-cloud-bolt" }, };
        return descriptions[code] || { text: "Unknown", icon: "fa-solid fa-question-circle" };
    }
    function findNextUpcomingEvent() {
        const now = new Date();
        if (specialEvents.length === 0) return null;
        return specialEvents.map(event => { const eventDate = new Date(event.date + 'T00:00:00'); eventDate.setFullYear(now.getFullYear()); if (eventDate < now) eventDate.setFullYear(now.getFullYear() + 1); return { ...event, futureDate: eventDate }; }).sort((a, b) => a.futureDate - b.futureDate)[0];
    }
    function startCountdown() { if (countdownInterval) clearInterval(countdownInterval); const nextEvent = findNextUpcomingEvent(); if (!nextEvent) { eventTitleEl.textContent = "No Upcoming Events"; eventDateEl.textContent = "Add a special date!"; [daysEl, hoursEl, minsEl, secsEl].forEach(el => el.textContent = '0'); return; } eventTitleEl.textContent = nextEvent.name; eventDateEl.textContent = nextEvent.futureDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); const update = () => { const diff = nextEvent.futureDate - new Date(); if (diff <= 0) { startCountdown(); return; } daysEl.textContent = Math.floor(diff / 86400000); hoursEl.textContent = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, '0'); minsEl.textContent = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0'); secsEl.textContent = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0'); }; update(); countdownInterval = setInterval(update, 1000); }
    settingsBtn.addEventListener('click', () => { renderEventsList(); modalContainer.style.display = 'flex'; });
    closeModalBtn.addEventListener('click', () => { modalContainer.style.display = 'none'; });
    modalContainer.addEventListener('click', (e) => { if (e.target === modalContainer) modalContainer.style.display = 'none'; });
    uploadBtn.addEventListener('click', () => photoUploadInput.click());
    photoUploadInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = () => { document.body.style.backgroundImage = `url(${reader.result})`; }; reader.readAsDataURL(file); const formData = new FormData(); formData.append('file', file); fetch(`${backendUrl}/upload`, { method: 'POST', body: formData }).then(response => response.json()).then(data => { if (data.success) console.log('Upload successful!'); else console.error('Upload failed:', data.error); }).catch(error => console.error('Error uploading file:', error)); } });


    // START THE APP
    init();

});
