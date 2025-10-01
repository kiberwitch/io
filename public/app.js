
        function createStars() {
            const container = document.getElementById('stars-container');
            const starCount = 200; 
            
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.classList.add('star');
                
         
                const size = Math.random() * 2 + 1;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                
         
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                
     
                const duration = Math.random() * 3 + 2;
                star.style.animationDuration = `${duration}s`;
                
    
                star.style.animationDelay = `${Math.random() * 5}s`;
                
                container.appendChild(star);
            }
        }

        window.addEventListener('load', createStars);
        

        window.addEventListener('resize', function() {
            const container = document.getElementById('stars-container');
            container.innerHTML = '';
            createStars();
        });