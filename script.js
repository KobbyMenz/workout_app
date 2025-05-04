"strict";

//ELEMENTS
const modalContainer = document.querySelector(".modal-container");
const modalMessage = document.querySelector(".modal-message");
const modalBtn = document.querySelector(".modal-btn");
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
//////////////////////////////////////////////////
////////////////////////////////////////////////

const displayModal = function (message) {
  modalContainer.classList.toggle("active");
  modalMessage.textContent = message;

  modalBtn.addEventListener("click", function () {
    modalContainer.classList.remove("active");
  });
};

//======= WORKOUT CLASS (PARENT CLASS) ============
class Workout {
  date = new Date();
  id = Date.now().toString().slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
			"January",
			"Febuary",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}, ${this.date.getFullYear()}`;
  }
}

//======= RUNNING WORKOUT CLASS  (CHILD CLASS) ============
class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.type = "running";
    this.calcPace(); //Calling pace method
    this._setDescription();
  }
  //Method for calculating pace
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//======= CYCLING WORKOUT CLASS  (CHILD CLASS) ============
class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.type = "cycling";
    this.calcSpeed(); //Calling speed method
    this._setDescription();
  }
  //Method for Calculating speed
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
//================ APP CLASS STARTS =================
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition(); //Calling getPosition method to get and display position on the map

    //Get workouts data from local storage
    this._getLocalStorage();

    //Form event listener to display workout after submission
    form.addEventListener("submit", this._newWorkout.bind(this));

    //Change Event handler on inputType
    inputType.addEventListener("change", this._toggleElevation.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  //---- METHOD TO GET POSITION ON MAP ------
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),

        function () {
          displayModal(
            "Could not get your location. Please check your internet connection and try again."
          );
        }
      );
    }
  }

  //-----METHOD TO LOAD MAP --------
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling click on map
    this.#map.on("click", this._showForm.bind(this));

    // loading workout from local storage on map
    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);

      this._renderWorkoutMarker(workout);
    });
  }

  //----METHOD TO SHOW FORM AFTER CLICKING ON MAP----
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  //------METHOD FOR TOGGLING ELEVATION AND CADENCE INPUT BY SELECTING INPUT TYPE---------
  _toggleElevation() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");

    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  //--------WORKOUT METHOD -----------
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((input) => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every((input) => input > 0);

    e.preventDefault();

    //Get data from Form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout running, create running object
    if (type === "running") {
      const cadence = Number(inputCadence.value);

      //Check if data is valid
      if (
        !validInputs(cadence, distance, duration) ||
        !allPositive(cadence, distance, duration)
      )
        return displayModal("Inputs have to be positive numbers.");

      //Add new object to workout array
      workout = new Running([lat, lng], distance, duration, cadence);
      this.#workouts.push(workout);
    }

    //If workout cycling, create cycling object
    else if (type === "cycling") {
      const elevation = Number(inputElevation.value);

      //Check if data is valid
      if (
        !validInputs(elevation, distance, duration) ||
        !allPositive(distance, duration)
      )
        return displayModal("Inputs have to be positive numbers.");

      //Add new object to workout array
      workout = new Cycling([lat, lng], distance, duration, elevation);
      this.#workouts.push(workout);
    }

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Clear text fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.classList.toggle("hidden"); //hidding form after submission

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        //workout Popup properties
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${this.type === "running" ? "🏃 " : "🚴"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
					<h2 class="workout__title">${workout.description}</h2>
					<div class="workout__details">
						<span class="workout__icon">${
              workout.type === "running"
                ? `<i class="fas fa-running"></i>`
                : `<i class="fas fa-biking"></i>`
            } </span>
						<span class="workout__value">${workout.distance}</span>
						<span class="workout__unit">km</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon"><i class="fas fa-stopwatch"></i></span>
						<span class="workout__value">${workout.duration}</span>
						<span class="workout__unit">min</span>
					</div>
		`;

    if (workout.type === "running")
      html += `
				<div class="workout__details">
					<span class="workout__icon"><i class="fas fa-bolt"></i></span>
					<span class="workout__value">${workout.pace.toFixed(1)}</span>
					<span class="workout__unit">min/km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon"><i class="fas fa-check-circle"></i>
					</span>
					<span class="workout__value">${workout.cadence}</span>
					<span class="workout__unit">spm</span>
				</div> 
			</li>
			`;

    if (workout.type === "cycling")
      html += `
				<div class="workout__details">
						<span class="workout__icon"><i class="fas fa-bolt"></i></span>
						<span class="workout__value">${workout.speed.toFixed(1)}</span>
						<span class="workout__unit">km/h</span>
					</div>  
					<div class="workout__details">
						<span class="workout__icon"><i class="fas fa-icicles"></i></span>
					 	<span class="workout__value">${workout.elevationGain}</span>
						<span class="workout__unit">m</span>
					</div>
				</li>
			`;
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (workout) => workout.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((workout) => this._renderWorkout(workout));
  }

  resetWorkouts() {
    localStorage.removeItem("workouts");
    location.reload();
    // app.resetWorkouts();
  }
} //================ APP CLASS ENDS =================

const app = new App();
