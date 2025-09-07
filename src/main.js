// Подключаем Supabase JS библиотеку
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Инициализируем Supabase клиент
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Проверяем, что переменные загружены
if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials are missing!');
    showError('Ошибка: Не настроены ключи Supabase');
}

// Создаем клиент Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Делаем supabase глобально доступным
window.supabaseClient = supabase;

// ===== ОСНОВНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С БД =====

async function loadAllFilms() {
    try {
        let { data: films, error } = await supabase
            .from('films')
            .select('*')
            .order('rating', { ascending: false });

        if (error) throw error;
        
        window.allFilms = films;
        renderFilms(films, 'filmsGrid');
        
    } catch (error) {
        console.error('Ошибка загрузки фильмов:', error);
        showError('filmsGrid', 'Ошибка загрузки фильмов');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}
// 2. Поиск фильмов
    async function searchFilms(query) {
        try {
            if (query.length < 2) {
                loadAllFilms();
                return;
            }

            let { data: films, error } = await supabase
                .from('films')
                .select('*')
                .ilike('title', `%${query}%`)
                .order('rating', { ascending: false });

            if (error) throw error;
            renderFilms(films, 'filmsGrid');
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }

    // 3. Загрузка фильмов по категории
    async function loadFilmsByCategory(category) {
        try {
            showLoading('filmsGrid');
            let query = supabase
                .from('films')
                .select('*')
                .order('rating', { ascending: false });

            switch(category) {
                case 'popular':
                    query = query.gte('rating', 8.0);
                    break;
                case 'new':
                    query = query.gte('release_year', 2023);
                    break;
                case 'comedy':
                    query = query.ilike('genre', '%комедия%');
                    break;
                case 'drama':
                    query = query.ilike('genre', '%драма%');
                    break;
                case 'horror':
                    query = query.ilike('genre', '%ужас%');
                    break;
                case 'fantasy':
                    query = query.ilike('genre', '%фантастика%');
                    break;
            }

            let { data: films, error } = await query;

            if (error) throw error;
            renderFilms(films, 'filmsGrid');
            
        } catch (error) {
            console.error('Ошибка загрузки по категории:', error);
            showError('filmsGrid', 'Ошибка загрузки');
        }
    }

    // 4. Загрузка рекомендаций
    async function loadRecommendations() {
        try {
            showLoading('recommendationsGrid');
            let { data: films, error } = await supabase
                .from('films')
                .select('*')
                .order('rating', { ascending: false })
                .limit(3);

            if (error) throw error;
            renderRecommendations(films);
            
        } catch (error) {
            console.error('Ошибка загрузки рекомендаций:', error);
            showError('recommendationsGrid', 'Ошибка загрузки рекомендаций');
        }
    }

    // 5. Добавление в избранное
    async function addToFavorites(filmId) {
        try {
            if (!currentUser) {
                alert('Пожалуйста, войдите в систему чтобы добавить в избранное');
                return;
            }

            const { data, error } = await supabase
                .from('favorites')
                .insert([{ user_id: currentUser.id, film_id: filmId }]);

            if (error) throw error;
            
            alert('Фильм добавлен в избранное!');
            
        } catch (error) {
            console.error('Ошибка добавления в избранное:', error);
            alert('Ошибка добавления в избранное');
        }
    }

    // 6. Подписка на рассылку
    async function subscribeNewsletter() {
        try {
            const email = document.getElementById('newsletterEmail').value;
            
            if (!email) {
                alert('Пожалуйста, введите email');
                return;
            }

            const { data, error } = await supabase
                .from('newsletter')
                .insert([{ email: email, subscribed_at: new Date() }]);

            if (error) throw error;
            
            alert('Вы успешно подписались на рассылку!');
            document.getElementById('newsletterEmail').value = '';
            
        } catch (error) {
            console.error('Ошибка подписки:', error);
            alert('Ошибка подписки на рассылку');
        }
    }

    // 7. Регистрация пользователя
    async function registerUser(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            throw error;
        }
    }

    // 8. Вход пользователя
    async function loginUser(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            
            currentUser = data.user;
            return data;
            
        } catch (error) {
            console.error('Ошибка входа:', error);
            throw error;
        }
    }

    // 9. Выход пользователя
    async function logoutUser() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            currentUser = null;
            
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    // 10. Получение избранных фильмов
    async function getFavorites() {
        try {
            if (!currentUser) return [];

            let { data: favorites, error } = await supabase
                .from('favorites')
                .select(`
                    film_id,
                    films (*)
                `)
                .eq('user_id', currentUser.id);

            if (error) throw error;
            return favorites.map(fav => fav.films);
            
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
            return [];
        }
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

    // Отображение фильмов
    function renderFilms(films, containerId) {
        const container = document.getElementById(containerId);
        if (!films || films.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-10">
                    <i class="fas fa-film text-3xl text-gray-600 mb-4"></i>
                    <p class="text-gray-400">Фильмы не найдены</p>
                </div>
            `;
            return;
        }

        container.innerHTML = films.map(film => `
            <div class="group cursor-pointer">
                <div class="relative overflow-hidden rounded-lg mb-3">
                    <img src="${film.poster_url || 'https://picsum.photos/300/450'}" 
                         alt="${film.title}" 
                         class="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                        <button onclick="playFilm(${film.id})" class="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <div class="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                        ${film.rating?.toFixed(1) || 'N/A'}
                    </div>
                </div>
                <h3 class="font-semibold text-sm mb-1 line-clamp-1">${film.title}</h3>
                <p class="text-gray-400 text-xs">${film.release_year} • ${film.genre}</p>
                <button onclick="addToFavorites(${film.id})" class="mt-2 text-red-400 hover:text-red-300 text-xs">
                    <i class="fas fa-heart mr-1"></i>В избранное
                </button>
            </div>
        `).join('');
    }

    // Отображение рекомендаций
    function renderRecommendations(films) {
        const container = document.getElementById('recommendationsGrid');
        if (!films || films.length === 0) return;

        container.innerHTML = films.map(film => `
            <div class="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition-colors">
                <img src="${film.poster_url || 'https://picsum.photos/600/300'}" 
                     alt="${film.title}" 
                     class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2">${film.title}</h3>
                    <p class="text-gray-300 text-sm mb-4 line-clamp-3">${film.description || 'Описание отсутствует'}</p>
                    <div class="flex justify-between items-center">
                        <span class="bg-red-600 text-xs px-3 py-1 rounded-full">${film.genre || 'Не указан'}</span>
                        <span class="text-yellow-400 text-sm">★ ${film.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <button onclick="playFilm(${film.id})" class="w-full mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors">
                        Смотреть
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Показать загрузку
    function showLoading(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-spinner fa-spin text-2xl text-red-600"></i>
                <p class="mt-2 text-gray-400">Загрузка...</p>
            </div>
        `;
    }

    // Показать ошибку
    function showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                <p class="mt-2 text-gray-400">${message}</p>
                <button onclick="loadAllFilms()" class="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
                    Попробовать снова
                </button>
            </div>
        `;
    }

    // Воспроизведение фильма
    function playFilm(filmId) {
        const film = allFilms.find(f => f.id === filmId);
        if (film && film.video_url) {
            window.open(film.video_url, '_blank');
        } else {
            alert('Видео недоступно для просмотра');
        }
    }

    // Переключение поиска на мобильных
    function toggleMobileSearch() {
        const searchContainer = document.getElementById('mobileSearchContainer');
        const menu = document.getElementById('mobile-menu');
        
        searchContainer.classList.toggle('hidden');
        if (!searchContainer.classList.contains('hidden')) {
            menu.classList.remove('hidden');
        }
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====

    // Обработчики событий
    document.getElementById('searchInputDesktop').addEventListener('input', (e) => {
        searchFilms(e.target.value);
    });

    document.getElementById('searchInputMobile').addEventListener('input', (e) => {
        searchFilms(e.target.value);
    });

    document.getElementById('mobile-menu-button').addEventListener('click', function() {
        const menu = document.getElementById('mobile-menu');
        menu.classList.toggle('hidden');
    });

    // Загрузка данных при старте
    document.addEventListener('DOMContentLoaded', function() {
        loadAllFilms();
        loadRecommendations();
        
        // Проверка авторизации
        supabase.auth.getUser().then(({ data: { user } }) => {
            currentUser = user;
        });
    });

    // // Глобальное экспортирование функций для HTML
    // window.addToFavorites = addToFavorites;
    // window.playFilm = playFilm;s
    // window.loadFilmsByCategory = loadFilmsByCategory;
    // window.loadAllFilms = loadAllFilms;
    // window.subscribeNewsletter = subscribeNewsletter;
    // window.toggleMobileSearch = toggleMobileSearch;


// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('Supabase initialized with hidden keys');
    loadAllFilms();
});