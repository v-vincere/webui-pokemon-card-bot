document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('password-form');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const maxAttempts = 3;

    let attempts = localStorage.getItem('password_attempts') ? parseInt(localStorage.getItem('password_attempts')) : 0;

    if (attempts >= maxAttempts) {
        passwordInput.disabled = true;
        form.querySelector('button').disabled = true;
        errorMessage.textContent = 'You have exceeded the maximum number of login attempts.';
        errorMessage.style.display = 'block';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = passwordInput.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.removeItem('password_attempts');
                window.location.href = data.redirect || '/';
            } else {
                attempts++;
                localStorage.setItem('password_attempts', attempts);
                
                if (attempts >= maxAttempts) {
                    passwordInput.disabled = true;
                    form.querySelector('button').disabled = true;
                    errorMessage.textContent = 'You have exceeded the maximum number of login attempts.';
                } else {
                    errorMessage.textContent = `Invalid password. You have ${maxAttempts - attempts} attempts remaining.`;
                }
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
        }
    });
});