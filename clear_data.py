from app import app
from extensions import db
from models import User, Transcript

def clear_all_data():
    with app.app_context():
        print("Clearing all data from the database...")
        # Delete dependent transcripts first due to foreign key constraints
        Transcript.query.delete()
        # Delete all users
        User.query.delete()
        
        db.session.commit()
        print("Done. All student records and transcripts have been removed.")

if __name__ == "__main__":
    clear_all_data()
