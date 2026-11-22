"""More topics for the AI course: computational thinking, algorithms, data, models, metrics, generative AI and the maths behind ML.
Original notes written for this project (not copied from any textbook)."""

MORE_TOPICS = [
    {
        "name": "Computational Thinking",
        "skill": "Computational thinking",
        "description": "The four habits used to solve problems the way a computer scientist does.",
        "objectives": ["Break a problem into parts (decomposition)", "Spot patterns", "Use abstraction", "Design an algorithm"],
        "note": (
            "Computational thinking is a way of solving problems so that a person or a computer can carry out the solution. It has four main habits.\n\n"
            "1. Decomposition: break a big problem into smaller, easier parts. Planning a trip becomes choosing a place, booking travel and packing.\n"
            "2. Pattern recognition: look for things that repeat or are similar, so one solution can be reused.\n"
            "3. Abstraction: keep only the details that matter and ignore the rest. A metro map shows stations and lines, not the real distances.\n"
            "4. Algorithms: write clear step-by-step instructions that solve the problem.\n\n"
            "AI uses all four: a model finds patterns in data, ignores irrelevant detail and follows a learned procedure to produce an answer."
        ),
        "points": [
            ("Decomposition means splitting a problem into smaller parts.", True),
            ("Abstraction keeps the important details and hides the rest.", True),
            ("An algorithm is a clear, finite, step-by-step solution.", True),
        ],
        "questions": [
            ("Breaking a large problem into smaller parts is called:", ["Abstraction", "Decomposition", "Debugging", "Compilation"], 1, "Decomposition splits a problem into manageable pieces.", "easy"),
            ("A metro map that shows only stations and lines is an example of:", ["Abstraction", "Iteration", "Overfitting", "Encryption"], 0, "It hides distances and other details that do not matter for travel.", "easy"),
            ("Noticing that several problems share the same structure is:", ["Pattern recognition", "Decomposition", "Sorting", "Compression"], 0, "Patterns let you reuse one solution.", "easy"),
            ("Which is NOT one of the four computational thinking habits?", ["Decomposition", "Pattern recognition", "Algorithm design", "Memorising answers"], 3, "The four habits are decomposition, patterns, abstraction and algorithms.", "medium"),
            ("A clear sequence of steps that solves a problem is a(n):", ["Algorithm", "Variable", "Dataset", "Pixel"], 0, "That is the definition of an algorithm.", "easy"),
        ],
    },
    {
        "name": "Algorithms and Flowcharts",
        "skill": "Computational thinking",
        "description": "Writing solutions as algorithms, pseudocode and flowcharts using sequence, selection and iteration.",
        "objectives": ["List the properties of a good algorithm", "Read basic flowchart symbols", "Use sequence, selection and iteration"],
        "note": (
            "A good algorithm is precise, finite (it ends), has defined inputs and outputs, and each step is simple enough to carry out.\n\n"
            "Pseudocode describes an algorithm in plain, code-like language. A flowchart draws it: an oval marks start or end, a rectangle is a process step, "
            "a diamond is a decision (yes or no), a parallelogram is input or output, and arrows show the flow.\n\n"
            "Every algorithm is built from three structures: sequence (steps in order), selection (choose a path with if/else) and iteration (repeat steps in a loop).\n\n"
            "Example: to find the largest of three numbers, compare them one by one using selection. To add the numbers 1 to 100, repeat an addition step with a loop."
        ),
        "points": [
            ("A good algorithm is precise, finite and has clear inputs and outputs.", True),
            ("In a flowchart a diamond is a decision and a rectangle is a process.", True),
            ("Algorithms are built from sequence, selection and iteration.", True),
        ],
        "questions": [
            ("Which flowchart symbol shows a decision?", ["Oval", "Rectangle", "Diamond", "Parallelogram"], 2, "A diamond splits the flow into yes and no paths.", "easy"),
            ("Repeating steps in a loop is called:", ["Sequence", "Selection", "Iteration", "Abstraction"], 2, "Iteration means repetition.", "easy"),
            ("An algorithm must be finite. This means it:", ["Uses little memory", "Eventually ends", "Has one step", "Has no input"], 1, "An endless procedure is not a valid algorithm.", "medium"),
            ("An if/else choice between two paths is:", ["Selection", "Iteration", "Sequence", "Input"], 0, "Selection chooses a path based on a condition.", "easy"),
            ("Which structure would you use to add the numbers 1 to 100?", ["A loop", "A single if", "A diamond only", "No structure"], 0, "Repeated addition is iteration.", "medium"),
        ],
    },
    {
        "name": "Data and Preprocessing",
        "skill": "Machine learning",
        "description": "Getting data ready: types, cleaning, missing values, scaling and splitting.",
        "objectives": ["Tell numeric from categorical data", "Handle missing values", "Scale features", "Split data for training and testing"],
        "note": (
            "Models learn from data, so preparing it well matters as much as the model itself.\n\n"
            "Data can be numeric (height, price) or categorical (colour, city). Each column used by a model is a feature; the value we want to predict is the label or target.\n\n"
            "Cleaning: remove duplicates, fix wrong entries and decide what to do with missing values (drop the row, or fill with the mean, median or most common value).\n\n"
            "Scaling: features on very different ranges (age 0-100 against income 0-1,000,000) can mislead a model, so we normalise (squeeze to 0-1) or standardise (mean 0, spread 1).\n\n"
            "Categories are turned into numbers, for example one-hot encoding. Finally, split into training and test sets, often 80% and 20%, before training."
        ),
        "points": [
            ("Features are the inputs; the label or target is what we predict.", True),
            ("Missing values can be dropped or filled with the mean, median or most common value.", True),
            ("Scale features so large-range columns do not dominate.", False),
        ],
        "questions": [
            ("In a model that predicts house price, the price is the:", ["Feature", "Label or target", "Noise", "Index"], 1, "The value we want to predict is the target.", "easy"),
            ("Which is categorical data?", ["Temperature", "Colour of a car", "Weight", "Salary"], 1, "Colour falls into categories, not numbers on a scale.", "easy"),
            ("Normalisation typically rescales values to the range:", ["0 to 1", "-100 to 100", "1 to 1000", "0 to infinity"], 0, "Min-max normalisation maps values to 0-1.", "medium"),
            ("Which is a common way to handle a missing numeric value?", ["Fill with the median", "Fill with the word 'blank'", "Delete the whole dataset", "Ignore it always"], 0, "Median or mean filling keeps the row usable.", "medium"),
            ("One-hot encoding is used to:", ["Turn categories into numbers", "Delete duplicates", "Increase image size", "Speed up the GPU"], 0, "Each category becomes its own 0/1 column.", "medium"),
        ],
    },
    {
        "name": "Regression and Classification",
        "skill": "Machine learning",
        "description": "Predicting numbers and categories: linear regression, logistic regression, decision trees and k-nearest neighbours.",
        "objectives": ["Tell regression from classification", "Describe linear regression", "Explain decision trees and KNN"],
        "note": (
            "Supervised learning has two main jobs. Regression predicts a number (a house price). Classification predicts a category (spam or not spam).\n\n"
            "Linear regression fits a straight line y = mx + c through the data by choosing the line with the smallest error, usually mean squared error (MSE). "
            "Logistic regression, despite its name, is a classification method that outputs a probability between 0 and 1.\n\n"
            "A decision tree asks a series of yes/no questions about the features until it reaches an answer, like a flowchart learned from data. "
            "k-nearest neighbours (KNN) classifies a new point by looking at the k closest training points and taking a majority vote.\n\n"
            "Simple models are easier to explain; complex ones can fit more but risk overfitting."
        ),
        "points": [
            ("Regression predicts numbers; classification predicts categories.", True),
            ("Linear regression minimises the mean squared error.", True),
            ("KNN classifies by majority vote of the k nearest points.", False),
        ],
        "questions": [
            ("Predicting tomorrow's temperature in degrees is:", ["Regression", "Classification", "Clustering", "Encryption"], 0, "The output is a number, so it is regression.", "easy"),
            ("Deciding whether an email is spam is:", ["Regression", "Classification", "Scaling", "Sorting"], 1, "The output is a category.", "easy"),
            ("Linear regression usually minimises:", ["Mean squared error", "Number of features", "File size", "Training time"], 0, "The line is chosen to make squared errors small.", "medium"),
            ("A decision tree works by:", ["Asking a series of yes/no questions", "Averaging all data", "Drawing a random line", "Deleting features"], 0, "Each node splits the data on a question.", "easy"),
            ("In KNN with k = 3, a new point is labelled by:", ["The majority of its 3 nearest neighbours", "Its single farthest point", "A coin toss", "The average of all points"], 0, "KNN uses a majority vote of nearby points.", "medium"),
        ],
    },
    {
        "name": "Model Evaluation Metrics",
        "skill": "Machine learning",
        "description": "Measuring how good a model is: accuracy, precision, recall, F1 and the confusion matrix.",
        "objectives": ["Read a confusion matrix", "Compute accuracy, precision and recall", "Choose a metric for the problem"],
        "note": (
            "A confusion matrix counts four outcomes for a yes/no model: true positives (TP), false positives (FP), true negatives (TN) and false negatives (FN).\n\n"
            "Accuracy = (TP + TN) / all predictions. It can mislead when classes are unbalanced: a model that always says 'no disease' is 99% accurate if only 1% are ill.\n"
            "Precision = TP / (TP + FP): of everything predicted positive, how much was right.\n"
            "Recall = TP / (TP + FN): of all real positives, how many were found.\n"
            "F1 score is the harmonic mean of precision and recall.\n\n"
            "Choose the metric that matches the cost of mistakes. For a disease screening test, missing a sick patient (low recall) is worse than a false alarm."
        ),
        "points": [
            ("Precision = TP / (TP + FP); recall = TP / (TP + FN).", True),
            ("Accuracy can mislead when classes are unbalanced.", True),
            ("Pick the metric that matches the cost of mistakes.", False),
        ],
        "questions": [
            ("A model finds 8 of 10 real positives and makes no false alarms. Its recall is:", ["0.2", "0.8", "1.0", "0.5"], 1, "Recall = 8 / 10 = 0.8.", "medium"),
            ("TP = 40, FP = 10. Precision is:", ["0.2", "0.4", "0.8", "1.25"], 2, "Precision = 40 / (40 + 10) = 0.8.", "medium"),
            ("Why can accuracy mislead on unbalanced data?", ["A model can be 'accurate' by always predicting the common class", "Accuracy cannot be calculated", "It needs a GPU", "It ignores true positives only"], 0, "Always saying 'no' can score 99% if only 1% are positive.", "medium"),
            ("A false negative is:", ["A real positive predicted as negative", "A real negative predicted as positive", "A correct positive", "A correct negative"], 0, "The model missed a real positive.", "easy"),
            ("For screening a serious disease, which is usually most important?", ["High recall", "Short training time", "Large dataset only", "Colourful charts"], 0, "Missing real cases is costly, so recall matters most.", "medium"),
        ],
    },
    {
        "name": "Generative AI and Prompting",
        "skill": "Language models",
        "description": "How AI creates text, images and code, and how to write good prompts.",
        "objectives": ["Define generative AI", "Write a clear prompt", "Name risks of generated content"],
        "note": (
            "Generative AI creates new content such as text, images, music or code, rather than only labelling or predicting. "
            "Language models generate text token by token; image models such as diffusion models start from noise and refine it into a picture that matches a description.\n\n"
            "A good prompt states the task, gives context, says the format you want and sets limits. 'Explain gradient descent to a 15-year-old in five sentences, with one example' "
            "works better than 'explain gradient descent'. You can improve answers by giving examples (few-shot prompting) or asking for step-by-step reasoning.\n\n"
            "Risks: made-up facts (hallucination), copied or biased content, privacy leaks if you paste personal data, and over-reliance. Check the output and say when AI helped."
        ),
        "points": [
            ("Generative AI creates new text, images, audio or code.", True),
            ("Good prompts give the task, context, format and limits.", True),
            ("Always check generated content for mistakes and bias.", False),
        ],
        "questions": [
            ("Which is generative AI?", ["A model that writes a short story", "A calculator", "A file zipper", "A spell-check dictionary only"], 0, "Generative AI creates new content.", "easy"),
            ("Which prompt is better?", ["'Tell me about AI'", "'Explain AI to a Class 9 student in 5 bullet points with one example'", "'AI'", "'More'"], 1, "It gives audience, format and limits.", "easy"),
            ("Giving the model a few worked examples inside the prompt is called:", ["Few-shot prompting", "Overfitting", "Pruning", "Clustering"], 0, "Examples in the prompt guide the answer.", "medium"),
            ("Diffusion image models start from:", ["Random noise", "A finished photo", "A spreadsheet", "Audio"], 0, "They refine noise step by step into an image.", "hard"),
            ("A risk of generated text is:", ["Confident but false statements", "It is always correct", "It can never be biased", "It protects privacy by itself"], 0, "Hallucinations and bias are known risks.", "easy"),
        ],
    },
    {
        "name": "Maths Behind Machine Learning",
        "skill": "Mathematics",
        "description": "The vectors, matrices, probability and gradients that make machine learning work.",
        "objectives": ["Describe data as vectors and matrices", "Explain gradient descent", "Use basic probability"],
        "note": (
            "Machine learning runs on maths.\n\n"
            "Linear algebra: a data point with several features is a vector, a whole dataset is a matrix, and a neural network layer is mostly a matrix multiplication.\n\n"
            "Calculus: to reduce the loss we need to know which way to change each weight. The gradient (the vector of partial derivatives of the loss) points toward the steepest increase, "
            "so gradient descent moves the weights a small step in the opposite direction. The size of that step is the learning rate: too big and training overshoots, too small and it crawls.\n\n"
            "Probability and statistics: models output probabilities, and we judge them with averages, variance and distributions. "
            "Bayes' rule updates a belief when new evidence arrives."
        ),
        "points": [
            ("A neural network layer is mostly matrix multiplication.", True),
            ("Gradient descent steps against the gradient of the loss.", True),
            ("The learning rate sets the step size: too big overshoots, too small is slow.", True),
        ],
        "questions": [
            ("A dataset of many data points with several features is naturally stored as a:", ["Matrix", "Single number", "Image only", "Sentence"], 0, "Rows are data points and columns are features.", "easy"),
            ("Gradient descent updates weights in the direction of the:", ["Negative gradient", "Positive gradient", "Random vector", "Mean of the data"], 0, "Moving against the gradient reduces the loss.", "medium"),
            ("If the learning rate is far too large, training may:", ["Overshoot and fail to settle", "Always finish faster and better", "Stop using data", "Delete weights"], 0, "Big steps can jump past the minimum.", "medium"),
            ("The gradient is made of:", ["Partial derivatives", "Probabilities only", "Labels", "File names"], 0, "Each component is the partial derivative with respect to one weight.", "medium"),
            ("Probabilities of all outcomes of an event add up to:", ["1", "0", "10", "100 only for coins"], 0, "Total probability is 1 (or 100%).", "easy"),
        ],
    },
]
