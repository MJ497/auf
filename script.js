 tailwind.config = {
            darkMode: 'class',
            theme: {
                fontFamily: {
                    sans: ['Outfit', 'sans-serif'],
                },
                extend: {
                    colors: {
                        gold: {
                            500: '#E68B31'
                            
                        },
                        blue:{
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8'
                        }
                    }
                }
            }
        }


           // Trustee Modal Functions
        function openTrusteeModal(trusteeId) {
            document.getElementById(`${trusteeId}-modal`).classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
            document.body.style.overflow = 'auto';
        }

        // Close modal when clicking outside content
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal(this.id);
                }
            });
        });

     


        // Video duration control (simulated for demo)
        const heroVideo = document.querySelector('.hero-video');
        if (heroVideo) {
            heroVideo.addEventListener('loadedmetadata', function() {
                // In a real implementation, we would set the video to play for 6 seconds
                console.log('Video loaded, would play for 6 seconds in production');
            });
        }

        // Donation amount buttons
        document.querySelectorAll('[data-amount]').forEach(button => {
            button.addEventListener('click', function() {
                // Remove focus from all buttons
                document.querySelectorAll('[data-amount]').forEach(btn => {
                    btn.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-500');
                });
                
                // Add focus to clicked button
                this.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-500');
                
                // Update donation amount input
                const amount = this.getAttribute('data-amount');
                document.querySelector('input[type="number"]').value = amount;
            });
        });

        
       

        // All other interactive elements
        document.getElementById('all-events-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Loading all events...');
        });

        // Scholarship application links
        document.querySelectorAll('[id$="-link"]').forEach(link => {
            if (link.id.includes('secondary') || link.id.includes('university') || link.id.includes('postgrad')) {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    alert(`Redirecting to ${this.textContent.trim()} application form...`);
                });
            }
        });