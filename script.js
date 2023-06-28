document.getElementById('openModal').addEventListener('click', function() {
    document.getElementById('videoModal').style.display = 'block';
    document.querySelector("#videoModal video").play();
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('videoModal').style.display = 'none';
  document.querySelector("#videoModal video").pause();
});

window.addEventListener('click', function(event) {
    if (event.target == document.getElementById('videoModal')) {
        document.getElementById('videoModal').style.display = 'none';
        document.querySelector("#videoModal video").pause();
    }
});

// Function to handle intersection changes
function handleIntersection(entries) {
  var button = document.querySelector('.video-button');
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
       button.style.transform = 'translate(0%)';  // Show the button
    } else {
      button.style.transform = 'translate(200%)';  // Show the button
    }
  });
}

// Create a new Intersection Observer
var container = document.querySelector('main ul');
var observer = new IntersectionObserver(handleIntersection);

// Observe the container element
observer.observe(container);

document.getElementById('newsletterForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission

    var email = document.getElementById('newsletter').value;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'save_email.php', true); // Replace with the PHP file that will handle the email saving
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            // Handle response if needed
            console.log(xhr.responseText);
            document.getElementById('newsletter').value = "Gesendet";
            document.getElementById('newsletter').disabled = true;
        }
    };
    xhr.send('newsletter=' + encodeURIComponent(email));
});