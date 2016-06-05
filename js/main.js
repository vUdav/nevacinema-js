(function () {
	"use strict";

	var app = {};

	// вносим объект в глобальную область видимости
	window.app = app;

	// информация о местах
	app.seats = {};

	// контрольная точка приложения
	app.init = function () {
		// принимаем хэш из урла
		var filmId = window.location.hash.slice(1) || 1;
		// записываем айди фильма глобально
		app.filmId = filmId;
		// хэш всегда должен быть числом, провеяем это
		if (Number(filmId) != filmId) {
			filmId = 1;
		}

		// принимаем json данные фильма
		app.ajax({
			url: "film-"+filmId+".json"
		}, function(err, data){
			if(err) document.body.classList.add("status-404");
			else app.drawFilmData(data);
		});

		// инициализируем фукнцию открытия модкли
		app.initTimeButton();
		// инициализируем фукнцию закрытия модалки
		app.closePopup();

		// инициализируем функцию вывода мест
		app.initSeats();
	}

	// фукнция обработки мест
	app.initSeats = function() {
		var schemeElem = document.querySelector(".seanse_scheme");
		if(!schemeElem) throw new Error("Seanse scheme not found");

		var checked = "seanse_scheme__seat--check";

		schemeElem.addEventListener('click',function(e) {
			var target = e.target;

			// если кликнутый элемент не элемент места
			if (!target.classList.contains("seanse_scheme__seat")) return;

			// если кликнутый элемент это забронированное место
			if (target.classList.contains("seanse_scheme__seat--busy")) return;

			// кликнули на место
			// определяем координаты кликнутого места
			var coords = target.getAttribute("data-coords");
			if (!app.seats[coords]) {
				target.classList.add(checked);
				app.seats[ coords ] = "checked";
			} else {
				target.classList.remove(checked);
				delete app.seats[ coords ];
			}

			// обновляем текст о выбранных местах
			app.drawCheckedSeats();
		});
	};

	// фукнция добавления инфомрации о выбранных местах
	app.drawCheckedSeats = function(){
		// пушим в массив выбранные места
		var checkedCoords = [];
		var status;
		for (var coords in app.seats) {
			status = app.seats[coords];
			if (status == "checked") {
				checkedCoords.push(coords);
			}
		};

		// сортируем значения мест
		// пишем свою фукнцию сортировки чтобы избежать 10<1
		checkedCoords.sort(function(coordsA,coordsB){
			var rowA = +coordsA.split(":")[0],
					seatA = +coordsA.split(":")[1];

			var rowB = +coordsB.split(":")[0],
					seatB = +coordsB.split(":")[1];

			if (rowA > rowB) return 1;
			if (seatA > seatB) return 1;
			return -1;
		});

		// формируем строку с выбранными местами
		var textLines = checkedCoords.map(function(coords){
			var row = coords.split(":")[0],
					seats = coords.split(":")[1];

			return "<li>Ряд "+ row +": место"+seats+"</li>";
		});

		// вставляем текст в элемент
		var textEl = document.querySelector('#seat-number');
		if(!textEl) throw new Error("Seats list not found");
		textEl.innerHTML = textLines.join("");

		// определяем количество выбранных мест и билетов
		var countEl = document.querySelector("#seat-count");
		if(!countEl) throw new Error("Seats count not found");
		var couponEl = document.querySelector("#coupon-count");
		if(!couponEl) throw new Error("Coupons count not found");
		var count = textLines.length;
		countEl.innerText = count;
		couponEl.innerText = count;

		// определеяем сумму за билеты
		var priceEl = document.querySelector("#session-price");
		var sumEl = document.querySelector("#coupon-sum");
		sumEl.innerText = priceEl.innerText * count;
	};

	// функция показа модалки по клику на время
	app.initTimeButton = function() {
		var popup = document.querySelector('.seanse_popup');
		if(!popup) throw new Error("Popup not found");

		var buttonContainer = document.querySelector('.schedule__list');
		if(!popup) throw new Error("Button container not found");

		buttonContainer.addEventListener('click',function(e){
			var target = e.target;
			// определяем цель клика
			if (target.className != "schedule__cell" && target.parentNode.className != "schedule__cell") return;
			// если кликнули куда надо то выводим попап
			document.body.classList.add("show-popup");

			// передаем данные о сеансе в попап
			// если мы кликнули на дочерний элемент то определяем родителя
			if (target.parentNode.className == "schedule__cell") {
				target = target.parentNode;
			}

			// передаем данные о сессии в попап
			app.sendDataSession(target);

			// загружаем список занятых мест
			app.loadBusySeats(
				app.filmId,
				app.textDate2serverFormat(app.popupSeanse.date || ""),
				(app.popupSeanse.time || "").replace(":","."),
				function(err, seats){
					app.drawBusySeats(seats);
				}
			);
		});
	}

	// функция приема занятых мест
	app.loadBusySeats = function(filmId, date, time, callback) {
		app.ajax({
			url: "busy-seats-"+filmId+"-"+date+"-"+time+".json"
		},callback);
	}

	// фукнция отрисовки занятых мест
	app.drawBusySeats = function(seats) {
		var seatsEl = document.querySelectorAll(".seanse_scheme__seat");
		seatsEl = [].slice.call(seatsEl);

		seatsEl.forEach(function(seatsEl){
			var coords = seatsEl.getAttribute("data-coords");
			// если место занято
			if(seats.indexOf(coords) != -1) {
				seatsEl.classList.add("seanse_scheme__seat--busy");
			}
		});
	};

	// '25 ноября 2015' -> '25.11.2015'
	app.textDate2serverFormat = function(textDate) {
		var parts = textDate.split(/\s+/);
		var day = parts[0];
		var month = parts[1].toLowerCase();
		var year = parts[2];

		switch (month[0]) {
			case "я":
				month = 1;
				break;
			case "ф":
				month = 2;
				break;
			case "м":
				// март
				if ( month[2] == "р" ) {
					month = 3;
				} else {
					// май
					month = 5;
				}
				break;
			case "а":
				// апрель
				if ( month[1] == "п" ) {
					month = 4;
				} else {
					// август
					month = 8;
				}
				break;
			case "и":
				// июнь
					if ( month[2] == "н" ) {
					month = 6;
				} else {
					// июль
					month = 7;
				}
				break;
			case "с":
				month = 9;
				break;
			case "о":
				month = 10;
				break;
			case "н":
				month = 11;
				break;
			case "д":
				month = 12;
				break;
		}

		return day + "."+ month + "." + year;
	};

	// функция скрытия модалки
	app.closePopup = function(){
		var closeBtn = document.querySelector('.seanse_popup__header__close a');
		if(!closeBtn) throw new Error("Close button not found");

		closeBtn.addEventListener('click',function(e){
			e.preventDefault();
			document.body.classList.remove("show-popup");
			app.resetSeanse();
		});
	};


	// фукнция сброса данных о местах при закрытии попапа
	app.resetSeanse = function(){
		var date = document.querySelector("#session-date");
		if(!date) throw new Error("Date element not found");
		var time = document.querySelector("#session-time");
		if(!time) throw new Error("Time element not found");
		var price = document.querySelector("#session-price");
		if(!price) throw new Error("Price element not found");
		var seatCount = document.querySelector("#seat-count");
		if(!seatCount) throw new Error("Seats count element not found");
		var seatNumber = document.querySelector("#seat-number");
		if(!seatNumber) throw new Error("Seats number element not found");
		var couponCount = document.querySelector("#coupon-count");
		if(!couponCount) throw new Error("Coupon count element not found");
		var couponSum = document.querySelector("#coupon-sum");
		if(!couponSum) throw new Error("Coupon sum element not found");
		var seatStatus = document.querySelectorAll(".seanse_scheme__seat");
		if(!seatStatus) throw new Error("Seat status element not found");

		date.innerText = "";
		time.innerText = "";
		price.innerText = "";
		seatCount.innerText = "";
		seatNumber.innerText = "";
		couponCount.innerText = "";
		couponSum.innerText = "";
		[].slice.call(seatStatus).forEach(function(i){
			i.className = "seanse_scheme__seat";
		});
	};

	// фукнция передачи данных о сеансе в попап
	app.sendDataSession = function(el){
		app.popupSeanse = {};
		// получаем даныне
		app.popupSeanse.time = el.getAttribute('data-time');
		if(!app.popupSeanse.time) throw new Error("Time of session not defined");
		app.popupSeanse.price = el.getAttribute('data-price');
		if(!app.popupSeanse.price) throw new Error("Price of session not defined");
		app.popupSeanse.date = el.getAttribute('data-date');
		if(!app.popupSeanse.date) throw new Error("Date of session not defined");

		// определяем элементы попапа
		var dateEl = document.querySelector('#session-date');
		if(!dateEl) throw new Error("Data element not found");
		var timeEl = document.querySelector('#session-time');
		if(!timeEl) throw new Error("Time element not found");
		var priceEl = document.querySelector('#session-price');
		if(!priceEl) throw new Error("Price element not found");

		// передаем данные на страницу
		dateEl.innerText = app.popupSeanse.date;
		timeEl.innerText = app.popupSeanse.time;
		priceEl.innerText = app.popupSeanse.price;
	};

	// функция вывода данных о фильме
	app.drawFilmData = function(data) {
		// выборка элементов
		var nameEl = document.querySelector('#film-name');
		if (!nameEl) throw new Error("Title element not found");
		var posterEl = document.querySelector('#film-poster');
		if (!posterEl) throw new Error("Poster element not found");
		var genreEl = document.querySelector('#film-genre');
		if (!genreEl) throw new Error("Genre element not found");
		var prodEl = document.querySelector('#film-prod');
		if (!prodEl) throw new Error("Production element not found");
		var timeEl = document.querySelector('#film-time');
		if (!timeEl) throw new Error("Time element not found");
		var authorEl = document.querySelector('#film-author');
		if (!authorEl) throw new Error("Author element not found");
		var actorsEl = document.querySelector('#film-actors');
		if (!actorsEl) throw new Error("Actor element not found");
		var descriptionEl = document.querySelector('#film-description');
		if (!descriptionEl) throw new Error("Description element not found");
		var yearsEl = document.querySelector('#film-years');
		if (!yearsEl) throw new Error("Years element not found");

		// принимаем данные
		nameEl.innerHTML = data.name;
		posterEl.setAttribute('src','img/'+data.poster);
		genreEl.innerHTML = data.genre;
		prodEl.innerHTML = data.prod;
		timeEl.innerHTML = data.time;
		authorEl.innerHTML = data.author;
		actorsEl.innerHTML = data.actors;
		descriptionEl.innerHTML = data.description;
		yearsEl.innerHTML = data.years;

		// формируем список сеансов
		var scheduleEl = document.querySelector(".schedule__list");
		if (!scheduleEl) throw new Error("Schedule list element not found");
		// перебираем дни
		for(var day in data.days) {
			// создаем элементы дня
			var rowEl = document.createElement('div');
			rowEl.className = "schedule__row";
			var dateEl = document.createElement('p');
			dateEl.className = "schedule__text";
			dateEl.innerText = day.slice(0,-5);
			var scheduleListEl = document.createElement('ul');
			scheduleListEl.className = "schedule__cells_list";

			// перебираем сеансы дня
			for (var seanse in data.days[day]) {
				var seanseEl = document.createElement("li");
				seanseEl.className = "schedule__cell";
				seanseEl.setAttribute('data-time',data.days[day][seanse].time);
				seanseEl.setAttribute('data-price',data.days[day][seanse].price);
				seanseEl.setAttribute('data-date',day);
				seanseEl.innerHTML = "<span>"+data.days[day][seanse].time+"</span><span>"+data.days[day][seanse].price+" р.</span>";
				scheduleListEl.appendChild(seanseEl);
			}

			// выводим элементы
			rowEl.appendChild(dateEl);
			rowEl.appendChild(scheduleListEl);
			scheduleEl.appendChild(rowEl);
		}
	};

	// функция аякса
	app.ajax = function(params, callback) {
		// метод HTTP запроса
		var method = params.method || "GET";
		// адрес запрсоа
		var url = params.url;
		// данные запроса
		var data = params.data;
		var formData = new FormData();

		for(var key in data) {
			formData.append(key,data[key]);
		}

		var xhr = new XMLHttpRequest();
		xhr.open(method, url, true);

		xhr.onreadystatechange = function() {
			// функция получения ответов с сервера
			if (xhr.readyState != 4) return;
			if (xhr.status !=200) {
				callback(new Error("bad status"));
				return;
			}

			var response = xhr.responseText; //получаем запрос в виде строки
			try {
				response = JSON.parse(response);
				callback(null, response);
			} catch(err) {
				callback(err);
			}
		}

		// отправляем запрос на сервер
		xhr.send(formData);
	}

	app.init();
}())