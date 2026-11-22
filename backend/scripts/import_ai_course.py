"""Adds the "Artificial Intelligence Foundations" course: 6 topics, a study note and key points for each,
and 5 starter MCQs per topic. Questions are marked as sample content: review them before real use.
Safe to run twice (nothing is duplicated).

Run from the backend folder:
    .venv\\Scripts\\python.exe scripts\\import_ai_course.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.models import Course, Resource, ResourcePoint, Topic  # noqa: E402
from app.db.setup import init_database  # noqa: E402
from app.schemas import QuestionIn  # noqa: E402
from app.services.common import slugify  # noqa: E402
from app.services.questions import import_questions  # noqa: E402
from ai_more_topics import MORE_TOPICS  # noqa: E402


COURSE = {
    "name": "Artificial Intelligence Foundations",
    "description": "A beginner course on how AI works: machine learning, neural networks, language models, computer vision and using AI responsibly.",
    "level": "beginner",
    "duration_weeks": 6,
    "required_skills": ["AI concepts", "Machine learning", "Deep learning", "Language models", "Ethics"],
}

# Each topic: name, skill area, description, objectives, note text, key points, questions (text, options, correct index, explanation, difficulty)
TOPICS = [
    {
        "name": "What Is AI",
        "skill": "AI concepts",
        "description": "What artificial intelligence means, where it came from and what it can and cannot do today.",
        "objectives": ["Define artificial intelligence", "Tell narrow AI from general AI", "Name common everyday AI uses"],
        "note": (
            "Artificial intelligence (AI) is the field of building computer systems that perform tasks which normally need human intelligence, "
            "such as recognising speech, translating languages, making decisions or spotting patterns.\n\n"
            "Narrow AI does one specific job well, like a spam filter or a recommendation engine. Every AI system in use today is narrow. "
            "General AI, a system that can learn any task a human can, does not exist yet.\n\n"
            "The term was coined in 1956 at the Dartmouth workshop. Progress came in waves: early rule-based systems, then machine learning, "
            "and from the 2010s deep learning, helped by more data and faster hardware (GPUs).\n\n"
            "AI is not magic. It finds patterns in data, so its output is only as good as the data and the goal it was given."
        ),
        "points": [
            ("AI means computer systems doing tasks that normally need human intelligence.", True),
            ("All AI in use today is narrow AI: good at one task, not general.", True),
            ("The term artificial intelligence dates from the 1956 Dartmouth workshop.", False),
        ],
        "questions": [
            ("Which statement best describes narrow AI?", ["A system that can learn any human task", "A system built to do one specific task well", "A system with human emotions", "A system that needs no data"], 1, "Narrow AI is designed for a specific task, such as spam filtering.", "easy"),
            ("Which of these is an example of AI in everyday life?", ["A calculator adding two numbers", "A movie recommendation on a streaming app", "A printed timetable", "A light switch"], 1, "Recommendation systems learn from your behaviour to suggest items.", "easy"),
            ("Roughly when was the term 'artificial intelligence' coined?", ["1856", "1956", "1986", "2016"], 1, "It was introduced at the 1956 Dartmouth workshop.", "medium"),
            ("What hardware helped deep learning take off in the 2010s?", ["Floppy disks", "GPUs", "Typewriters", "Fax machines"], 1, "GPUs can run the many parallel calculations neural networks need.", "medium"),
            ("Why is an AI system's output only as good as its data?", ["It copies the data's patterns, including its flaws", "It ignores the data", "It always corrects bad data", "Data is not used at all"], 0, "Models learn patterns from data, so poor or biased data leads to poor results.", "medium"),
        ],
    },
    {
        "name": "Machine Learning Basics",
        "skill": "Machine learning",
        "description": "How computers learn from examples: supervised, unsupervised and reinforcement learning.",
        "objectives": ["Explain supervised and unsupervised learning", "Describe training and test data", "Recognise overfitting"],
        "note": (
            "Machine learning (ML) lets a computer learn patterns from data instead of following hand-written rules.\n\n"
            "Supervised learning uses labelled examples (for instance emails marked spam or not spam) to predict labels for new data. "
            "Unsupervised learning has no labels and looks for structure on its own, such as grouping similar customers (clustering). "
            "Reinforcement learning learns by trial and error, receiving rewards for good actions.\n\n"
            "Data is split into training data, used to learn, and test data, kept aside to check how well the model works on examples it has never seen.\n\n"
            "Overfitting happens when a model memorises the training data, including its noise, and then performs badly on new data. "
            "Underfitting is the opposite: the model is too simple to capture the pattern."
        ),
        "points": [
            ("Supervised learning learns from labelled examples; unsupervised learning finds structure without labels.", True),
            ("Always evaluate a model on test data it has not seen during training.", True),
            ("Overfitting means memorising the training data and failing on new data.", True),
        ],
        "questions": [
            ("Which type of learning uses labelled examples?", ["Supervised learning", "Unsupervised learning", "Random learning", "Passive learning"], 0, "Labels (the correct answers) guide supervised learning.", "easy"),
            ("Grouping customers by similar behaviour without labels is an example of:", ["Supervised classification", "Clustering", "Reinforcement learning", "Data deletion"], 1, "Clustering is an unsupervised technique.", "medium"),
            ("Why is a separate test set used?", ["To make training faster", "To check performance on unseen data", "To add more labels", "To remove outliers"], 1, "Test data shows how the model will behave on new examples.", "easy"),
            ("A model scores 99% on training data but 60% on new data. This is most likely:", ["Underfitting", "Overfitting", "Perfect learning", "A labelling error"], 1, "A big gap between training and new-data scores signals overfitting.", "medium"),
            ("In reinforcement learning, an agent improves by:", ["Reading labelled answers", "Receiving rewards for actions", "Grouping data", "Copying another model"], 1, "Rewards and penalties from the environment guide the agent.", "medium"),
        ],
    },
    {
        "name": "Neural Networks and Deep Learning",
        "skill": "Deep learning",
        "description": "How layers of simple units learn complex patterns, and why deep learning changed AI.",
        "objectives": ["Describe a neuron, layer and weight", "Explain how a network learns", "Name common architectures"],
        "note": (
            "An artificial neural network is made of layers of simple units called neurons. Each neuron takes numbers in, multiplies them by weights, "
            "adds them up and passes the result through an activation function.\n\n"
            "Networks have an input layer, one or more hidden layers and an output layer. Deep learning means networks with many hidden layers.\n\n"
            "Learning works by measuring the error with a loss function and adjusting the weights to reduce it. Backpropagation calculates how much each weight "
            "contributed to the error, and gradient descent nudges the weights in the direction that lowers it.\n\n"
            "Common architectures: convolutional neural networks (CNNs) for images, recurrent networks for sequences, and transformers, which now power most language models."
        ),
        "points": [
            ("Neurons multiply inputs by weights, add them and apply an activation function.", True),
            ("Training lowers the loss by adjusting weights using backpropagation and gradient descent.", True),
            ("CNNs suit images; transformers suit language.", False),
        ],
        "questions": [
            ("What does 'deep' mean in deep learning?", ["Very large files", "Many hidden layers", "Secret data", "Slow training"], 1, "Deep networks have many hidden layers between input and output.", "easy"),
            ("What are weights in a neural network?", ["Parameters adjusted during learning", "The size of the dataset", "The computer's memory", "The output labels"], 0, "Weights are numbers the network tunes to reduce error.", "easy"),
            ("What does a loss function measure?", ["Training time", "How wrong the predictions are", "Number of layers", "Data size"], 1, "Loss quantifies the gap between predictions and the correct answers.", "medium"),
            ("Which architecture is most associated with image tasks?", ["Convolutional neural network", "Spreadsheet", "Decision calendar", "Linear clock"], 0, "CNNs are designed to find visual patterns such as edges and shapes.", "medium"),
            ("Which architecture powers most modern language models?", ["Transformer", "Perceptron only", "Clustering", "Linear regression"], 0, "Transformers use attention to relate words across a text.", "medium"),
        ],
    },
    {
        "name": "Language Models and NLP",
        "skill": "Language models",
        "description": "How computers work with human language, and how large language models generate text.",
        "objectives": ["Define natural language processing", "Explain tokens and prediction", "Know the limits of language models"],
        "note": (
            "Natural language processing (NLP) is the part of AI that works with human language: translation, summarising, search, chatbots and more.\n\n"
            "Text is split into tokens (pieces of words) and turned into numbers. A large language model (LLM) is trained on huge amounts of text to predict "
            "the next token, and by repeating this it produces whole answers. The transformer's attention mechanism lets it weigh which earlier words matter most.\n\n"
            "Prompting means writing clear instructions and context so the model gives a better answer.\n\n"
            "Limits: a language model can state false things with confidence (called hallucination), reflects biases in its training text, and has no built-in way to check facts. "
            "Always verify important answers."
        ),
        "points": [
            ("LLMs generate text by predicting the next token, repeatedly.", True),
            ("Hallucination means a model confidently states something false.", True),
            ("Clear prompts with context give better answers; always verify important facts.", False),
        ],
        "questions": [
            ("What is a token in a language model?", ["A piece of text such as part of a word", "A password", "A type of GPU", "A training label"], 0, "Text is split into tokens before being converted to numbers.", "easy"),
            ("What is a language model's core training task?", ["Predicting the next token", "Drawing pictures", "Sorting spreadsheets", "Compressing video"], 0, "Next-token prediction over huge text is the standard objective.", "medium"),
            ("What is a hallucination in an LLM?", ["A confident but false statement", "A slow response", "A blank answer", "A spelling check"], 0, "Models can produce fluent text that is not true.", "easy"),
            ("Which is NLP?", ["Translating a sentence between languages", "Resizing a photo", "Defragmenting a disk", "Playing audio"], 0, "Translation works directly with human language.", "easy"),
            ("What should you do with an important answer from a chatbot?", ["Trust it fully", "Verify it with reliable sources", "Ignore all chatbots", "Share it unchecked"], 1, "Models can be wrong, so check facts that matter.", "medium"),
        ],
    },
    {
        "name": "Computer Vision",
        "skill": "Machine learning",
        "description": "How AI interprets images and video: classification, detection and where it is used.",
        "objectives": ["Define computer vision", "Tell classification from detection", "Name real uses"],
        "note": (
            "Computer vision teaches computers to understand images and video.\n\n"
            "Image classification gives a whole picture one label (cat or dog). Object detection finds and boxes each object in the picture. "
            "Segmentation labels every pixel, for example separating road from pavement.\n\n"
            "Convolutional neural networks learn visual features in layers: edges first, then shapes, then whole objects. They need many labelled images, "
            "so labelling quality matters.\n\n"
            "Uses include medical scan analysis, self-driving cars, face unlock, quality checks in factories and reading text from photos (OCR)."
        ),
        "points": [
            ("Classification labels a whole image; detection finds and locates objects in it.", True),
            ("CNNs learn edges first, then shapes, then objects.", False),
            ("Computer vision needs many well-labelled images.", True),
        ],
        "questions": [
            ("Which task puts a box around each object in a picture?", ["Object detection", "Image classification", "Speech recognition", "Translation"], 0, "Detection both identifies and locates objects.", "easy"),
            ("Labelling an entire photo as 'cat' is:", ["Image classification", "Segmentation", "Clustering of audio", "Reinforcement learning"], 0, "One label for the whole image is classification.", "easy"),
            ("What does OCR do?", ["Reads text from images", "Compresses video", "Detects viruses", "Trains robots"], 0, "Optical character recognition turns pictures of text into text.", "medium"),
            ("What does a CNN's early layers typically detect?", ["Edges and simple patterns", "Whole faces only", "Sentences", "File sizes"], 0, "Lower layers pick up edges, which later layers combine into shapes.", "medium"),
            ("Why does labelling quality matter for vision models?", ["Models learn from the labels they are given", "Labels are ignored", "Labels slow the screen", "Labels are only for humans"], 0, "Wrong labels teach the model wrong patterns.", "medium"),
        ],
    },
    {
        "name": "Responsible AI and Ethics",
        "skill": "Ethics",
        "description": "Bias, privacy, transparency and how to use AI fairly and safely.",
        "objectives": ["Explain how bias enters AI", "Describe privacy and transparency concerns", "Apply simple good practice"],
        "note": (
            "Responsible AI means building and using AI fairly, safely and openly.\n\n"
            "Bias: a model learns from past data, so if that data under-represents or unfairly treats some groups, the model can repeat or amplify the unfairness. "
            "Testing results across different groups helps find it.\n\n"
            "Privacy: training and using AI often involves personal data. Collect only what is needed, protect it and respect consent.\n\n"
            "Transparency and accountability: people should know when AI is involved, understand roughly how a decision was made, and be able to appeal. "
            "A human should stay responsible for high-stakes decisions such as hiring, loans or health.\n\n"
            "Good habits: check outputs, do not paste private information into tools you do not trust, credit sources, and be honest when work was AI-assisted."
        ),
        "points": [
            ("Biased training data can lead to unfair model decisions.", True),
            ("Keep a human accountable for high-stakes decisions.", True),
            ("Do not share private data with tools you do not trust.", False),
        ],
        "questions": [
            ("How can bias enter an AI system?", ["Through unrepresentative or unfair training data", "Only through slow hardware", "Only through the screen colour", "It cannot"], 0, "Models reflect the patterns, including unfair ones, in their data.", "easy"),
            ("Why keep a human responsible for high-stakes AI decisions?", ["So someone is accountable and can review mistakes", "Because AI never errs", "To make decisions slower on purpose", "It is not needed"], 0, "Accountability and review matter when decisions affect people's lives.", "medium"),
            ("Which is a good privacy habit?", ["Collect only the data you need", "Collect everything just in case", "Share data publicly", "Ignore consent"], 0, "Data minimisation reduces privacy risk.", "easy"),
            ("What does transparency mean for AI?", ["People can tell AI is used and roughly how it decides", "The model is invisible", "Outputs are hidden", "Only developers may ask"], 0, "Openness lets people understand and challenge decisions.", "medium"),
            ("A student uses AI to help write an essay. The honest approach is to:", ["Say that AI helped and check the content", "Hide it", "Never read the result", "Claim it was all manual"], 0, "Disclose assistance and verify the work.", "easy"),
        ],
    },
]


def main(course_info=None, topics=None, prefix="AI") -> int:
    course_info = course_info or COURSE
    topics = topics if topics is not None else TOPICS + MORE_TOPICS
    init_database()
    course, course_created = Course.get_or_create(
        name=course_info["name"],
        defaults={
            "slug": slugify(course_info["name"]),
            "description": course_info["description"],
            "level": course_info["level"],
            "duration_weeks": course_info["duration_weeks"],
            "required_skills": course_info["required_skills"],
            "is_published": True,
        },
    )
    rows = []
    notes_created = 0
    number = 0
    for item in topics:
        topic, _ = Topic.get_or_create(
            course=course,
            slug=slugify(item["name"]),
            defaults={
                "name": item["name"],
                "skill_area": item["skill"],
                "description": item["description"],
                "learning_objectives": item["objectives"],
            },
        )
        resource, created = Resource.get_or_create(
            course=course,
            topic=topic,
            title=f"{item['name']}: study notes",
            defaults={
                "resource_type": "note",
                "description": item["note"],
                "learning_objectives": item["objectives"],
                "skill_parameter": item["skill"],
                "difficulty": "easy",
                "is_published": True,
            },
        )
        if created:
            notes_created += 1
            for position, (text, key) in enumerate(item["points"], start=1):
                ResourcePoint.create(resource=resource, topic=topic, text=text, is_key_concept=key, position=position)
        for text, options, correct, explanation, difficulty in item["questions"]:
            number += 1
            # Rotate the options so the right answer is not always in the same place.
            shift = number % len(options)
            options = options[shift:] + options[:shift]
            correct = (correct - shift) % len(options)
            rows.append(
                QuestionIn(
                    topic_id=topic.id,
                    code=f"{prefix}-S{number:03d}",
                    skill=item["skill"],
                    difficulty=difficulty,
                    text=text,
                    options=options,
                    correct_index=correct,
                    explanation=explanation,
                    is_sample=True,
                )
            )
    result = import_questions(rows, creator=None)
    print(
        f"Course '{course.name}': {'created' if course_created else 'already existed'}. "
        f"Notes added: {notes_created}. Questions created: {result['created']}, updated: {result['updated']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
