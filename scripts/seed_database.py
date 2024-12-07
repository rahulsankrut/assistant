from pymongo import MongoClient
import random
from datetime import datetime, timedelta
import uuid

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.medical_assistant
patients_collection = db.patients

# Sample data for generating synthetic patients
first_names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Emily', 'Robert', 'Maria']
last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
genders = ['male', 'female']
conditions = ['Hypertension', 'Diabetes', 'Asthma', 'Arthritis', 'GERD', 'Anxiety', 'Depression', 'Migraine']
medications = ['Lisinopril', 'Metformin', 'Albuterol', 'Omeprazole', 'Sertraline', 'Ibuprofen', 'Acetaminophen']
allergies = ['Penicillin', 'Sulfa', 'Latex', 'Peanuts', 'None', 'Aspirin']
statuses = ['Active', 'Inactive']

def generate_vital_signs():
    systolic = random.randint(110, 140)
    diastolic = random.randint(60, 90)
    heart_rate = random.randint(60, 100)
    resp_rate = random.randint(12, 20)
    temp = round(random.uniform(36.5, 37.5), 1)
    return f"BP {systolic}/{diastolic}, HR {heart_rate}, RR {resp_rate}, Temp {temp}°C"

def generate_lab_results():
    wbc = round(random.uniform(4.5, 11.0), 1)
    hgb = round(random.uniform(12.0, 17.0), 1)
    plt = random.randint(150, 450)
    return f"WBC {wbc}, HGB {hgb}, PLT {plt}"

def generate_synthetic_patient():
    age = str(random.randint(18, 85))
    gender = random.choice(genders)
    medical_history = ', '.join(random.sample(conditions, random.randint(0, 3)))
    current_meds = ', '.join(random.sample(medications, random.randint(0, 3)))
    
    return {
        "id": str(uuid.uuid4())[:8],
        "name": f"{random.choice(first_names)} {random.choice(last_names)}",
        "age": age,
        "gender": gender,
        "chief_complaint": random.choice([
            "chest pain",
            "headache",
            "abdominal pain",
            "shortness of breath",
            "back pain",
            "fever",
            "dizziness"
        ]),
        "vital_signs": generate_vital_signs(),
        "medical_history": medical_history,
        "current_medications": current_meds,
        "allergies": random.choice(allergies),
        "lab_results": generate_lab_results(),
        "status": random.choice(statuses),
        "photo": None  # You can add photo URLs if needed
    }

def seed_database(num_patients=20):
    # Clear existing patients
    patients_collection.delete_many({})
    
    # Generate and insert new patients
    patients = [generate_synthetic_patient() for _ in range(num_patients)]
    result = patients_collection.insert_many(patients)
    
    print(f"Successfully inserted {len(result.inserted_ids)} patients")
    
    # Print first patient as sample
    print("\nSample patient:")
    print(patients_collection.find_one())

if __name__ == "__main__":
    try:
        seed_database()
        print("\nDatabase seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {str(e)}") 