//Side NavBar Scripts
document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('adminNavbar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
});

document.getElementById('overlay').addEventListener('click', function() {
    document.getElementById('adminNavbar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
});